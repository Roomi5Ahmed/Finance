'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { checkAndFireBudgetAlerts } from '@/app/(dashboard)/budgets/actions'
import { detectSubscriptions } from '@/app/(dashboard)/subscriptions/actions'

export async function addTransaction(formData: FormData) {
  const supabase = await createClient()

  // 1. Get user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // 2. Ensure they have an account
  let { data: account } = await supabase
    .from('accounts')
    .select('id')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (!account) {
    // Create a default account if none exists
    const { data: newAccount, error: accError } = await supabase
      .from('accounts')
      .insert({ user_id: user.id, name: 'Main Account', type: 'BANK', balance: 0 })
      .select('id')
      .single()
      
    if (accError) throw new Error('Failed to create default account')
    account = newAccount
  }

  // 3. Extract form data
  const type = formData.get('type') as string
  let amount = parseFloat(formData.get('amount') as string)
  if (type === 'expense') amount = -Math.abs(amount)
  else if (type === 'income') amount = Math.abs(amount)

  const date = formData.get('date') as string
  const merchant = formData.get('merchant') as string
  const categoryId = formData.get('category_id') as string
  const rawTags = formData.get('tags') as string
  
  const tags = rawTags ? rawTags.split(',').map(t => t.trim().replace(/^#/, '')) : []

  // 4. Insert transaction
  const { error } = await supabase.from('transactions').insert({
    user_id: user.id,
    account_id: account.id,
    category_id: categoryId || null,
    amount,
    date: new Date(date).toISOString(),
    merchant,
    tags,
  })

  if (error) {
    console.error('Insert error:', error)
    throw new Error(`DB Error: ${error.message} - ${error.details || ''}`)
  }

  // 5. Check budget alerts (fire-and-forget)
  checkAndFireBudgetAlerts(user.id).catch(console.error)

  // 6. Revalidate
  revalidatePath('/transactions')
  revalidatePath('/dashboard')
}

export async function bulkAddTransactions(transactions: any[]) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Get or create account
  let { data: account } = await supabase
    .from('accounts')
    .select('id')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (!account) {
    const { data: newAccount, error: accError } = await supabase
      .from('accounts')
      .insert({ user_id: user.id, name: 'Main Account', type: 'BANK', balance: 0 })
      .select('id')
      .single()
      
    if (accError) throw new Error('Failed to create default account')
    account = newAccount
  }

  // Format payload
  const payload = transactions.map(tx => ({
    user_id: user.id,
    account_id: account.id,
    amount: tx.amount,
    date: new Date(tx.date).toISOString(),
    merchant: tx.merchant,
    notes: tx.notes || '',
  }))

  const { error } = await supabase.from('transactions').insert(payload)

  if (error) {
    console.error('Bulk insert error:', error)
    throw new Error('Failed to insert bulk transactions')
  }

  // Check budget alerts (fire-and-forget)
  checkAndFireBudgetAlerts(user.id).catch(console.error)

  // Detect new subscriptions (fire-and-forget)
  detectSubscriptions().catch(console.error)

  revalidatePath('/transactions')
  revalidatePath('/dashboard')
}

export async function getCategories() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name')
  
  if (error) return []
  return data
}

import { categorizeMerchantsWithGemini } from '@/utils/gemini'

export async function autoCategoriseTransactions() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // 1. Fetch uncategorized transactions
  const { data: uncategorized } = await supabase
    .from('transactions')
    .select('id, merchant')
    .eq('user_id', user.id)
    .is('category_id', null)

  if (!uncategorized || uncategorized.length === 0) return { count: 0, message: 'All transactions are already categorized!' }

  // 2. Fetch user's cache
  const { data: cache } = await supabase
    .from('merchant_category_cache')
    .select('merchant_name, category_id')
    .eq('user_id', user.id)

  const cacheMap = new Map((cache || []).map(c => [c.merchant_name.toLowerCase(), c.category_id]))
  const toUpdate: { id: string, category_id: string }[] = []
  const uniqueUnknownMerchants = new Set<string>()

  // 3. Check cache first
  for (const tx of uncategorized) {
    const merchantLower = tx.merchant.toLowerCase()
    if (cacheMap.has(merchantLower)) {
      toUpdate.push({ id: tx.id, category_id: cacheMap.get(merchantLower)! })
    } else {
      uniqueUnknownMerchants.add(tx.merchant)
    }
  }

  // 4. Send unknown merchants to Gemini
  if (uniqueUnknownMerchants.size > 0) {
    const categories = await getCategories()
    const merchantsArray = Array.from(uniqueUnknownMerchants)
    
    // Batch to 20 to avoid large prompt issues if needed, but for MVP one call is fine
    const geminiResults = await categorizeMerchantsWithGemini(merchantsArray.slice(0, 50), categories)

    // Build DB updates
    const newCacheEntries = []
    
    for (const [merchant, categoryId] of Object.entries(geminiResults)) {
      // Find valid UUID matching from Gemini
      if (!categoryId || !categoryId.includes('-')) continue; 
      
      // Add to cache
      newCacheEntries.push({
        user_id: user.id,
        merchant_name: merchant,
        category_id: categoryId,
        confidence: 0.85
      })

      // Add to transaction updates
      for (const tx of uncategorized) {
        if (tx.merchant === merchant) {
          toUpdate.push({ id: tx.id, category_id: categoryId })
        }
      }
    }

    // Insert new cache items
    if (newCacheEntries.length > 0) {
      // Upsert to avoid constraint errors if multiple run concurrently
      await supabase.from('merchant_category_cache').upsert(newCacheEntries, { onConflict: 'user_id, merchant_name' })
    }
  }

  // 5. Update transactions
  let updatedCount = 0
  if (toUpdate.length > 0) {
    // Supabase JS doesn't support bulk update easily, so we loop or build a case statement.
    // For small batches, looping is acceptable.
    for (const update of toUpdate) {
      const { error } = await supabase
        .from('transactions')
        .update({ category_id: update.category_id })
        .eq('id', update.id)
      
      if (!error) updatedCount++
    }
  }

  revalidatePath('/transactions')
  revalidatePath('/dashboard')

  return { count: updatedCount, message: `Successfully auto-categorised ${updatedCount} transactions!` }
}

export async function triggerMockWebhook() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  let { data: account } = await supabase.from('accounts').select('id').eq('user_id', user.id).limit(1).single()
  if (!account) throw new Error('No account found to sync to')

  // Generate 5 dummy transactions to simulate a bank sync
  const mockTransactions = [
    { merchant: 'Uber Rides', amount: -450, date: new Date().toISOString() },
    { merchant: 'Amazon India', amount: -1299, date: new Date(Date.now() - 86400000).toISOString() },
    { merchant: 'Salary NEFT', amount: 85000, date: new Date(Date.now() - 86400000 * 2).toISOString() },
    { merchant: 'Zomato', amount: -650, date: new Date(Date.now() - 86400000 * 3).toISOString() },
    { merchant: 'Netflix', amount: -649, date: new Date(Date.now() - 86400000 * 4).toISOString() },
  ]

  // Since local dev doesn't have a Supabase Service Role Key to bypass RLS,
  // making an HTTP POST to our own webhook will fail authentication.
  // Instead, we simulate the webhook ingestion by directly calling our internal functions!
  await bulkAddTransactions(mockTransactions)
  
  // Trigger Gemini auto-categorisation in the background for the newly inserted mock data
  await autoCategoriseTransactions()

  revalidatePath('/transactions')
  revalidatePath('/dashboard')
  return { success: true, message: 'Mock Bank Sync completed! 5 transactions received and auto-categorised.' }
}
