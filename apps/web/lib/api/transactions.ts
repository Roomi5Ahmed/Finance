import type { SupabaseClient } from '@supabase/supabase-js'
import { checkAndFireBudgetAlerts } from './budgets'
import { detectSubscriptions } from './subscriptions'
import { categorizeMerchantsWithGemini } from '@/utils/gemini'

export async function getCategories(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name')

  if (error) return []
  return data
}

export interface AddTransactionInput {
  amount: number
  date: string
  merchant: string
  categoryId?: string | null
  tags?: string[]
  notes?: string
}

async function ensureAccount(supabase: SupabaseClient, userId: string): Promise<string> {
  const { data: account } = await supabase
    .from('accounts')
    .select('id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle()

  if (account) return account.id

  const { data: newAccount, error } = await supabase
    .from('accounts')
    .insert({ user_id: userId, name: 'Main Account', type: 'BANK', balance: 0 })
    .select('id')
    .single()

  if (error) throw new Error('Failed to create default account')
  return newAccount.id
}

export async function addTransaction(supabase: SupabaseClient, userId: string, input: AddTransactionInput) {
  const accountId = await ensureAccount(supabase, userId)

  let amount = input.amount
  if (amount > 0 && input.amount > 0) {
    // sign already provided by caller
  }

  const { error } = await supabase.from('transactions').insert({
    user_id: userId,
    account_id: accountId,
    category_id: input.categoryId || null,
    amount,
    date: new Date(input.date).toISOString(),
    merchant: input.merchant,
    notes: input.notes || '',
    tags: input.tags || [],
  })

  if (error) {
    console.error('Insert error:', error)
    throw new Error(`DB Error: ${error.message}`)
  }

  checkAndFireBudgetAlerts(supabase, userId).catch(console.error)
}

export async function bulkAddTransactions(supabase: SupabaseClient, userId: string, transactions: any[]) {
  const accountId = await ensureAccount(supabase, userId)

  const payload = transactions.map(tx => ({
    user_id: userId,
    account_id: accountId,
    amount: tx.amount,
    date: new Date(tx.date).toISOString(),
    merchant: tx.merchant,
    notes: tx.notes || '',
  }))

  const { data: inserted, error } = await supabase.from('transactions').insert(payload).select('*')

  if (error) {
    console.error('Bulk insert error:', error)
    throw new Error(`Failed to insert bulk transactions: ${error.message}`)
  }

  checkAndFireBudgetAlerts(supabase, userId).catch(console.error)
  detectSubscriptions(supabase, userId).catch(console.error)

  return inserted || []
}

export async function triggerMockWebhook(supabase: SupabaseClient, userId: string) {
  await ensureAccount(supabase, userId)

  const now = Date.now()
  const day = 86400000
  const mockTransactions = [
    { merchant: 'Uber Rides', amount: -450, date: new Date(now).toISOString() },
    { merchant: 'Amazon India', amount: -1299, date: new Date(now - day).toISOString() },
    { merchant: 'Salary NEFT', amount: 85000, date: new Date(now - day * 2).toISOString() },
    { merchant: 'Zomato', amount: -650, date: new Date(now - day * 3).toISOString() },
    { merchant: 'Netflix', amount: -649, date: new Date(now - day * 4).toISOString() },
    { merchant: 'Swiggy', amount: -380, date: new Date(now - day * 5).toISOString() },
    { merchant: 'Electricity Bill', amount: -2100, date: new Date(now - day * 6).toISOString() },
    { merchant: 'Flipkart', amount: -1899, date: new Date(now - day * 7).toISOString() },
    { merchant: 'ATM Withdrawal', amount: -5000, date: new Date(now - day * 8).toISOString() },
    { merchant: 'Freelance Payment', amount: 15000, date: new Date(now - day * 9).toISOString() },
  ]

  const inserted = await bulkAddTransactions(supabase, userId, mockTransactions)

  autoCategoriseTransactions(supabase, userId).catch(err => console.error('Auto-categorise failed:', err))

  return { success: true, inserted, message: `Mock Bank Sync completed! ${inserted.length} transactions imported.` }
}

export async function autoCategoriseTransactions(supabase: SupabaseClient, userId: string) {
  const { data: uncategorized } = await supabase
    .from('transactions')
    .select('id, merchant')
    .eq('user_id', userId)
    .is('category_id', null)

  if (!uncategorized || uncategorized.length === 0) return { count: 0, updated: [], message: 'All transactions are already categorized!' }

  const { data: cache } = await supabase
    .from('merchant_category_cache')
    .select('merchant_name, category_id')
    .eq('user_id', userId)

  const cacheMap = new Map((cache || []).map(c => [c.merchant_name.toLowerCase(), c.category_id]))
  const toUpdate: { id: string, category_id: string }[] = []
  const uniqueUnknownMerchants = new Set<string>()

  for (const tx of uncategorized) {
    const merchantLower = tx.merchant.toLowerCase()
    if (cacheMap.has(merchantLower)) {
      toUpdate.push({ id: tx.id, category_id: cacheMap.get(merchantLower)! })
    } else {
      uniqueUnknownMerchants.add(tx.merchant)
    }
  }

  if (uniqueUnknownMerchants.size > 0) {
    const categories = await getCategories(supabase)
    const merchantsArray = Array.from(uniqueUnknownMerchants)

    const geminiResults = await categorizeMerchantsWithGemini(merchantsArray.slice(0, 50), categories)

    const newCacheEntries = []

    for (const [merchant, categoryId] of Object.entries(geminiResults)) {
      if (!categoryId || !categoryId.includes('-')) continue

      newCacheEntries.push({
        user_id: userId,
        merchant_name: merchant,
        category_id: categoryId,
        confidence: 0.85
      })

      for (const tx of uncategorized) {
        if (tx.merchant === merchant) {
          toUpdate.push({ id: tx.id, category_id: categoryId })
        }
      }
    }

    if (newCacheEntries.length > 0) {
      await supabase.from('merchant_category_cache').upsert(newCacheEntries, { onConflict: 'user_id, merchant_name' })
    }
  }

  let updatedCount = 0
  const updatedIds: string[] = []
  if (toUpdate.length > 0) {
    for (const update of toUpdate) {
      const { error } = await supabase
        .from('transactions')
        .update({ category_id: update.category_id })
        .eq('id', update.id)

      if (!error) {
        updatedCount++
        updatedIds.push(update.id)
      }
    }
  }

  return { count: updatedCount, updatedIds, message: `Successfully auto-categorised ${updatedCount} transactions!` }
}
