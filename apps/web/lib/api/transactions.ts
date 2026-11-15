import type { SupabaseClient } from '@supabase/supabase-js'
import { checkAndFireBudgetAlerts } from './budgets'
import { detectSubscriptions } from './subscriptions'
import { normalizePayee } from '@/lib/categorisation/payee'
import { isMissingColumn, runCategorisationPipeline } from '@/lib/categorisation/pipeline'
import { TZ_OFFSET_MINUTES } from '@/lib/api/dashboard'

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

export interface BulkImportResult {
  imported: number
  categorised: number
  flagged: number
  pendingReview: number
  insertedIds: string[]
  message: string
  /** Distinct YYYY-MM months covered by the imported rows (app timezone). */
  months: string[]
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

  const payload: Record<string, unknown> = {
    user_id: userId,
    account_id: accountId,
    category_id: input.categoryId || null,
    amount: input.amount,
    date: new Date(input.date).toISOString(),
    merchant: input.merchant,
    notes: input.notes || '',
    tags: input.tags || [],
    // A category chosen by hand is a user rule the pipeline must never overwrite.
    category_source: input.categoryId ? 'user' : null,
    category_confidence: input.categoryId ? 1 : null,
  }

  let { error } = await supabase.from('transactions').insert(payload)
  if (error && isMissingColumn(error)) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- strip new columns for the pre-migration fallback insert
    const { category_source: _s, category_confidence: _c, ...legacy } = payload
    ;({ error } = await supabase.from('transactions').insert(legacy))
  }

  if (error) {
    console.error('Insert error:', error)
    throw new Error(`DB Error: ${error.message}`)
  }

  checkAndFireBudgetAlerts(supabase, userId).catch(console.error)
}

export interface BulkImportTxn {
  amount: number | string
  date: string
  merchant: string
  notes?: string | null
  txn_time?: string | null
}

export async function bulkAddTransactions(
  supabase: SupabaseClient,
  userId: string,
  transactions: BulkImportTxn[]
): Promise<BulkImportResult> {
  const accountId = await ensureAccount(supabase, userId)

  const buildPayload = (): Record<string, unknown>[] =>
    transactions.map(tx => ({
      user_id: userId,
      account_id: accountId,
      amount: tx.amount,
      date: new Date(tx.date).toISOString(),
      merchant: tx.merchant,
      notes: tx.notes || '',
      // Keep time-of-day from the statement (PRD 4.6) + mark as imported.
      txn_time: tx.txn_time || null,
      category_source: 'import',
    }))

  let payload = buildPayload()
  let { data: inserted, error } = await supabase.from('transactions').insert(payload).select('*')
  if (error && isMissingColumn(error)) {
    // Migration not applied yet: insert what the legacy schema supports.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- strip new columns for the pre-migration fallback insert
    payload = payload.map(({ txn_time: _t, category_source: _s, ...rest }) => rest)
    ;({ data: inserted, error } = await supabase.from('transactions').insert(payload).select('*'))
  }

  if (error) {
    console.error('Bulk insert error:', error)
    throw new Error(`Failed to insert bulk transactions: ${error.message}`)
  }

  checkAndFireBudgetAlerts(supabase, userId).catch(console.error)
  detectSubscriptions(supabase, userId).catch(console.error)

  // Run the 4-layer categorisation pipeline over the fresh rows (PRD 4.6).
  const pipeline = await runCategorisationPipeline(supabase, userId)
  const imported = inserted?.length ?? 0

  const monthKeys = new Set<string>()
  for (const tx of transactions) {
    const d = new Date(tx.date)
    if (Number.isNaN(d.getTime())) continue
    const shifted = new Date(d.getTime() + TZ_OFFSET_MINUTES * 60_000)
    monthKeys.add(
      `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}`
    )
  }

  return {
    imported,
    categorised: pipeline.categorised,
    flagged: pipeline.flagged,
    pendingReview: pipeline.pendingReview,
    insertedIds: (inserted || []).map((row: { id: string }) => row.id),
    message: `${imported} imported, ${pipeline.categorised} auto-categorised, ${pipeline.pendingReview} need review`,
    months: [...monthKeys].sort(),
  }
}

/**
 * Change one transaction's category (user action, source='user').
 * Returns the payee + how many transactions share it so the UI can offer
 * "Apply to all transactions from this payee?" (PRD 4.5).
 */
export async function setTransactionCategory(
  supabase: SupabaseClient,
  userId: string,
  txnId: string,
  categoryId: string | null
): Promise<{ payee: string | null; count: number }> {
  if (categoryId) {
    // RLS-scoped: only global or own categories are visible.
    const { data: category } = await supabase
      .from('categories')
      .select('id')
      .eq('id', categoryId)
      .maybeSingle()
    if (!category) throw new Error('Unknown category')
  }

  const { data: txn } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', txnId)
    .eq('user_id', userId)
    .maybeSingle()
  if (!txn) throw new Error('Transaction not found')

  const payload: Record<string, unknown> = {
    category_id: categoryId,
    category_source: categoryId ? 'user' : null,
    category_confidence: categoryId ? 1 : null,
    needs_review: false,
    updated_at: new Date().toISOString(),
  }

  let { error } = await supabase.from('transactions').update(payload).eq('id', txnId)
  if (error && isMissingColumn(error)) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- strip new columns for the pre-migration fallback update
    const { category_source: _s, category_confidence: _c, needs_review: _n, ...legacy } = payload
    ;({ error } = await supabase.from('transactions').update(legacy).eq('id', txnId))
  }
  if (error) throw new Error(`DB Error: ${error.message}`)

  const { data: all } = await supabase
    .from('transactions')
    .select('id, merchant')
    .eq('user_id', userId)

  const payee = txn.merchant as string | null
  const payeeKey = normalizePayee(payee || '')
  const count = (all || []).filter(t => normalizePayee(t.merchant || '') === payeeKey).length

  return { payee, count }
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
    { merchant: 'Swiggy', amount: -380, date: new Date(now - day * 5).toISOString() },
    { merchant: 'Netflix', amount: -649, date: new Date(now - day * 4).toISOString() },
    { merchant: 'Electricity Bill', amount: -2100, date: new Date(now - day * 6).toISOString() },
    { merchant: 'Flipkart', amount: -1899, date: new Date(now - day * 7).toISOString() },
    { merchant: 'ATM Withdrawal', amount: -5000, date: new Date(now - day * 8).toISOString() },
    { merchant: 'Freelance Payment', amount: 15000, date: new Date(now - day * 9).toISOString() },
  ]

  const result = await bulkAddTransactions(supabase, userId, mockTransactions)

  return {
    success: true,
    inserted: result.imported,
    message: `Mock Bank Sync completed! ${result.imported} transactions imported — ${result.categorised} auto-categorised, ${result.pendingReview} need review.`,
  }
}

export async function autoCategoriseTransactions(supabase: SupabaseClient, userId: string) {
  const result = await runCategorisationPipeline(supabase, userId)
  const pendingReview = await countPendingReview(supabase, userId)

  if (result.categorised === 0 && result.flagged === 0 && pendingReview === 0) {
    return {
      count: 0,
      categorised: 0,
      flagged: 0,
      pendingReview: 0,
      updatedIds: [] as string[],
      message: 'All transactions are already categorized!',
    }
  }

  let message = `Successfully auto-categorised ${result.categorised} transactions!`
  if (pendingReview > 0) message += ` ${pendingReview} need review.`

  return {
    count: result.categorised,
    categorised: result.categorised,
    flagged: result.flagged,
    pendingReview,
    updatedIds: result.updatedIds,
    message,
  }
}

async function countPendingReview(supabase: SupabaseClient, userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('transactions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('needs_review', true)

  if (error) {
    if (isMissingColumn(error)) return 0
    console.error('Failed to count review queue:', error)
    return 0
  }
  return count ?? 0
}
