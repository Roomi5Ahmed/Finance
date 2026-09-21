'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { createNotification } from '@/lib/notifications'

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

export async function detectSubscriptions() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Fetch all negative transactions (expenses)
  const { data: transactions } = await supabase
    .from('transactions')
    .select('id, amount, date, merchant, category_id, subscription_id')
    .eq('user_id', user.id)
    .lt('amount', 0)
    .order('date', { ascending: true })

  if (!transactions || transactions.length === 0) {
    return { detected: 0, message: 'No transactions to analyze.' }
  }

  // Fetch existing subscriptions to skip already-confirmed ones
  const { data: existingSubs } = await supabase
    .from('subscriptions')
    .select('id, merchant_normalized, status')
    .eq('user_id', user.id)

  const confirmedMerchants = new Set(
    (existingSubs || [])
      .filter(s => s.status === 'active' || s.status === 'cancelled_by_user' || s.status === 'not_recurring')
      .map(s => s.merchant_normalized)
  )

  // Group transactions by normalized merchant
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

    // Cluster by amount (±5% tolerance)
    const amounts = txs.map(t => t.amount)
    const avgAmount = amounts.reduce((s, a) => s + a, 0) / amounts.length

    const clusterTxs = txs.filter(t => {
      const diff = Math.abs(t.amount - avgAmount) / avgAmount
      return diff <= 0.05
    })

    if (clusterTxs.length < 2) continue

    // Detect cadence from dates
    const dates = clusterTxs.map(t => t.date)
    const cadence = detectCadence(dates)

    // Determine status
    const status = clusterTxs.length >= 3 ? 'active' : 'candidate'

    // Calculate price history
    const priceHistory = clusterTxs.map(t => ({
      amount: t.amount,
      date: t.date?.toISOString() || new Date().toISOString(),
    }))

    // Check for price changes
    const lastTx = clusterTxs[clusterTxs.length - 1]
    const prevTx = clusterTxs.length >= 2 ? clusterTxs[clusterTxs.length - 2] : null
    const lastAmount = lastTx?.amount || 0
    const prevAmount = prevTx?.amount || lastAmount
    const priceChangePercent = prevAmount > 0 ? Math.abs((lastAmount - prevAmount) / prevAmount * 100) : 0

    if (priceChangePercent > 10 && clusterTxs.length >= 3) {
      await createNotification(user.id, 'subscription_price_change',
        `Price change: ${merchantNormalized}`,
        `${merchantNormalized} changed from ₹${prevAmount.toLocaleString('en-IN')} to ₹${lastAmount.toLocaleString('en-IN')} (${priceChangePercent.toFixed(1)}% change).`,
        { merchant: merchantNormalized, old_amount: prevAmount, new_amount: lastAmount }
      )
    }

    // Upsert subscription
    const firstTx = clusterTxs[0]
    const lastTxEntry = clusterTxs[clusterTxs.length - 1]
    if (!firstTx || !lastTxEntry) continue
    const firstSeen = firstTx.date
    const lastCharged = lastTxEntry.date
    const nextExpected = getNextExpectedDate(lastCharged, cadence)

    const { data: existing } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .eq('merchant_normalized', merchantNormalized)
      .single()

    if (existing) {
      // Update existing subscription
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
      // Create new subscription
      const { data: newSub } = await supabase
        .from('subscriptions')
        .insert({
          user_id: user.id,
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
        // Link transactions to this subscription
        for (const tx of clusterTxs) {
          await supabase
            .from('transactions')
            .update({ subscription_id: newSub.id })
            .eq('id', tx.id)
        }
      }
    }
  }

  revalidatePath('/subscriptions')
  revalidatePath('/dashboard')

  return {
    detected: detectedCount,
    message: detectedCount > 0
      ? `Detected ${detectedCount} new subscription${detectedCount > 1 ? 's' : ''}!`
      : 'No new recurring subscriptions detected.',
  }
}

export async function getSubscriptions() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('subscriptions')
    .select('*, categories(name, icon, color)')
    .eq('user_id', user.id)
    .order('avg_amount', { ascending: false })

  if (error) return []
  return data || []
}

export async function updateSubscriptionStatus(subscriptionId: string, status: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('subscriptions')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', subscriptionId)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)

  revalidatePath('/subscriptions')
  return { success: true }
}

export async function deleteSubscription(subscriptionId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Unlink transactions first
  await supabase
    .from('transactions')
    .update({ subscription_id: null })
    .eq('subscription_id', subscriptionId)

  const { error } = await supabase
    .from('subscriptions')
    .delete()
    .eq('id', subscriptionId)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)

  revalidatePath('/subscriptions')
  return { success: true, message: 'Subscription removed.' }
}
