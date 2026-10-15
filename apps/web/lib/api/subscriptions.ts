import type { SupabaseClient } from '@supabase/supabase-js'
import { createNotification } from './notifications'
import { sendPushToUser } from '@/lib/push'

function normalizeMerchant(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function detectCadence(dates: Date[]): string {
  if (dates.length < 2) return 'monthly'

  const sorted = dates.sort((a, b) => a.getTime() - b.getTime())
  const gaps: number[] = []

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]
    const curr = sorted[i]
    if (prev && curr) {
      gaps.push(curr.getTime() - prev.getTime())
    }
  }

  if (gaps.length === 0) return 'monthly'
  const avgGapDays = gaps.reduce((sum, g) => sum + g, 0) / gaps.length / 86400000

  if (avgGapDays >= 5 && avgGapDays <= 10) return 'weekly'
  if (avgGapDays >= 25 && avgGapDays <= 35) return 'monthly'
  if (avgGapDays >= 80 && avgGapDays <= 100) return 'quarterly'
  if (avgGapDays >= 350 && avgGapDays <= 380) return 'annual'
  return 'monthly'
}

function getNextExpectedDate(lastDate: Date, cadence: string): Date {
  const next = new Date(lastDate)
  switch (cadence) {
    case 'weekly':
      next.setDate(next.getDate() + 7)
      break
    case 'monthly':
      next.setMonth(next.getMonth() + 1)
      break
    case 'quarterly':
      next.setMonth(next.getMonth() + 3)
      break
    case 'annual':
      next.setFullYear(next.getFullYear() + 1)
      break
    default:
      next.setMonth(next.getMonth() + 1)
  }
  return next
}

export async function getSubscriptions(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*, categories(name, icon, color)')
    .eq('user_id', userId)
    .order('avg_amount', { ascending: false })

  if (error) return []
  return data || []
}

export async function detectSubscriptions(supabase: SupabaseClient, userId: string) {
  const { data: transactions } = await supabase
    .from('transactions')
    .select('id, amount, date, merchant, category_id, subscription_id')
    .eq('user_id', userId)
    .lt('amount', 0)
    .order('date', { ascending: true })

  if (!transactions || transactions.length === 0) {
    return { detected: 0, message: 'No transactions to analyze.' }
  }

  const { data: existingSubs } = await supabase
    .from('subscriptions')
    .select('id, merchant_normalized, status')
    .eq('user_id', userId)

  const confirmedMerchants = new Set(
    (existingSubs || [])
      .filter(s => s.status === 'active' || s.status === 'cancelled_by_user' || s.status === 'not_recurring')
      .map(s => s.merchant_normalized)
  )

  const merchantGroups: Record<string, { id: string; amount: number; date: Date; category_id: string | null }[]> = {}

  for (const tx of transactions) {
    const normalized = normalizeMerchant(tx.merchant || '')
    if (!normalized || confirmedMerchants.has(normalized)) continue

    if (!merchantGroups[normalized]) {
      merchantGroups[normalized] = []
    }
    merchantGroups[normalized].push({
      id: tx.id,
      amount: Math.abs(tx.amount),
      date: new Date(tx.date),
      category_id: tx.category_id,
    })
  }

  let detectedCount = 0

  for (const [merchantNormalized, txs] of Object.entries(merchantGroups)) {
    if (txs.length < 2) continue

    const amounts = txs.map(t => t.amount)
    const avgAmount = amounts.reduce((s, a) => s + a, 0) / amounts.length

    const clusterTxs = txs.filter(t => {
      const diff = Math.abs(t.amount - avgAmount) / avgAmount
      return diff <= 0.05
    })

    if (clusterTxs.length < 2) continue

    const dates = clusterTxs.map(t => t.date)
    const cadence = detectCadence(dates)
    const status = clusterTxs.length >= 3 ? 'active' : 'candidate'

    const priceHistory = clusterTxs.map(t => ({
      amount: t.amount,
      date: t.date?.toISOString() || new Date().toISOString(),
    }))

    const lastTx = clusterTxs[clusterTxs.length - 1]
    const prevTx = clusterTxs.length >= 2 ? clusterTxs[clusterTxs.length - 2] : null
    const lastAmount = lastTx?.amount || 0
    const prevAmount = prevTx?.amount || lastAmount
    const priceChangePercent = prevAmount > 0 ? Math.abs((lastAmount - prevAmount) / prevAmount * 100) : 0

    if (priceChangePercent > 10 && clusterTxs.length >= 3) {
      const title = `Price change: ${merchantNormalized}`
      const body = `${merchantNormalized} changed from \u20B9${prevAmount.toLocaleString('en-IN')} to \u20B9${lastAmount.toLocaleString('en-IN')} (${priceChangePercent.toFixed(1)}% change).`
      await createNotification(supabase, userId, 'subscription_price_change', title, body,
        { merchant: merchantNormalized, old_amount: prevAmount, new_amount: lastAmount }
      )
      sendPushToUser(supabase, userId, { title, body, data: { type: 'subscription_price_change', merchant: merchantNormalized } })
    }

    const firstTx = clusterTxs[0]
    const lastTxEntry = clusterTxs[clusterTxs.length - 1]
    if (!firstTx || !lastTxEntry) continue
    const firstSeen = firstTx.date
    const lastCharged = lastTxEntry.date
    const nextExpected = getNextExpectedDate(lastCharged, cadence)

    const { data: existing } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('user_id', userId)
      .eq('merchant_normalized', merchantNormalized)
      .single()

    if (existing) {
      await supabase
        .from('subscriptions')
        .update({
          avg_amount: avgAmount,
          cadence,
          last_charged_at: lastCharged.toISOString(),
          next_expected_at: nextExpected.toISOString(),
          status,
          price_history: priceHistory,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
    } else {
      const { data: newSub } = await supabase
        .from('subscriptions')
        .insert({
          user_id: userId,
          merchant_normalized: merchantNormalized,
          category_id: firstTx.category_id,
          avg_amount: avgAmount,
          cadence,
          first_seen_at: firstSeen.toISOString(),
          last_charged_at: lastCharged.toISOString(),
          next_expected_at: nextExpected.toISOString(),
          status,
          price_history: priceHistory,
        })
        .select('id')
        .single()

      if (newSub) {
        detectedCount++
        for (const tx of clusterTxs) {
          await supabase
            .from('transactions')
            .update({ subscription_id: newSub.id })
            .eq('id', tx.id)
        }
      }
    }
  }

  const subs = await getSubscriptions(supabase, userId)

  return {
    detected: detectedCount,
    subscriptions: subs,
    message: detectedCount > 0
      ? `Detected ${detectedCount} new subscription${detectedCount > 1 ? 's' : ''}!`
      : 'No new recurring subscriptions detected.',
  }
}

export async function updateSubscriptionStatus(supabase: SupabaseClient, userId: string, subscriptionId: string, status: string) {
  const { error } = await supabase
    .from('subscriptions')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', subscriptionId)
    .eq('user_id', userId)

  if (error) throw new Error(error.message)
  return { success: true }
}

export interface CreateSubscriptionInput {
  merchant: string
  amount: number
  cadence: string
  categoryId?: string
  nextExpectedAt?: string
}

export async function createSubscription(supabase: SupabaseClient, userId: string, input: CreateSubscriptionInput) {
  const normalized = normalizeMerchant(input.merchant)
  const now = new Date().toISOString()

  const { data: sub, error } = await supabase
    .from('subscriptions')
    .insert({
      user_id: userId,
      merchant_normalized: normalized,
      category_id: input.categoryId || null,
      avg_amount: input.amount,
      cadence: input.cadence,
      first_seen_at: now,
      last_charged_at: now,
      next_expected_at: input.nextExpectedAt || getNextExpectedDate(new Date(), input.cadence).toISOString(),
      status: 'active',
      price_history: [{ amount: input.amount, date: now }],
    })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') throw new Error('A subscription for this merchant already exists.')
    throw new Error(error.message)
  }

  return { success: true, id: sub?.id }
}

export async function deleteSubscription(supabase: SupabaseClient, userId: string, subscriptionId: string) {
  await supabase
    .from('transactions')
    .update({ subscription_id: null })
    .eq('subscription_id', subscriptionId)

  const { error } = await supabase
    .from('subscriptions')
    .delete()
    .eq('id', subscriptionId)
    .eq('user_id', userId)

  if (error) throw new Error(error.message)
  return { success: true, message: 'Subscription removed.' }
}
