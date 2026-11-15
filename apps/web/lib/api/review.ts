import type { SupabaseClient } from '@supabase/supabase-js'
import type { PayeeType } from '@/lib/categorisation/payee'
import { classifyPayee, normalizePayee } from '@/lib/categorisation/payee'
import { isMissingColumn } from '@/lib/categorisation/pipeline'

export interface ReviewSuggestion {
  categoryId: string
  name: string
  icon: string | null
  confidence: number
  reason?: string
}

export interface ReviewGroup {
  payee: string
  key: string
  count: number
  total: number
  typical: number
  firstDate: string
  lastDate: string
  payeeType: PayeeType
  suggestion: ReviewSuggestion | null
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 1) return sorted[mid] ?? 0
  return ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2
}

interface ReviewTxnRow {
  id?: string
  merchant?: string | null
  amount?: number | string | null
  date?: string | null
  category_id?: string | null
  needs_review?: boolean | null
}

interface CategoryRow {
  id: string
  name: string
  icon: string | null
}

interface CacheRowLite {
  merchant_name?: string | null
  category_id?: string | null
  source?: string | null
  confidence?: number | string | null
  reason?: string | null
}

/**
 * Payee-grouped review queue (PRD 4.4), sorted by total spend descending.
 * Uses select('*') + in-memory filtering so it degrades gracefully if the
 * migration section has not been applied yet.
 */
export async function getReviewGroups(
  supabase: SupabaseClient,
  userId: string
): Promise<ReviewGroup[]> {
  const [{ data: txnRows }, { data: cacheRows }, { data: categoryRows }] = await Promise.all([
    supabase.from('transactions').select('*').eq('user_id', userId).is('category_id', null),
    supabase.from('merchant_category_cache').select('*').eq('user_id', userId),
    supabase.from('categories').select('*').order('name'),
  ])

  const reviewTxns = (txnRows || []).filter((t: ReviewTxnRow) => t.needs_review === true)
  if (reviewTxns.length === 0) return []

  const categoriesById = new Map(
    (categoryRows || []).map((c: CategoryRow) => [c.id, c] as [string, CategoryRow])
  )
  const aiSuggestions = new Map(
    (cacheRows || [])
      .filter(
        (c: CacheRowLite) =>
          (c.source ?? 'ai') === 'ai' && !!c.category_id && categoriesById.has(c.category_id)
      )
      .map(
        (c: CacheRowLite) => [normalizePayee(c.merchant_name || ''), c] as [string, CacheRowLite]
      )
  )

  interface Grouped {
    payee: string
    txns: ReviewTxnRow[]
  }
  const groups = new Map<string, Grouped>()
  for (const txn of reviewTxns) {
    const payee = (txn.merchant || '').replace(/\s+/g, ' ').trim()
    if (!payee) continue
    const key = normalizePayee(payee)
    const existing = groups.get(key)
    if (existing) existing.txns.push(txn)
    else groups.set(key, { payee, txns: [txn] })
  }

  const out: ReviewGroup[] = []
  for (const [key, group] of groups) {
    const amounts = group.txns.map(t => Math.abs(Number(t.amount)))
    const dates = group.txns
      .map(t => (t.date ? new Date(t.date).getTime() : NaN))
      .filter(n => !Number.isNaN(n))
    const sortedDates = [...dates].sort((a, b) => a - b)

    const suggestionRow = aiSuggestions.get(key)
    const suggestionCategory =
      suggestionRow && suggestionRow.category_id
        ? categoriesById.get(suggestionRow.category_id)
        : null
    const firstTime = sortedDates[0]
    const lastTime = sortedDates[sortedDates.length - 1]

    out.push({
      payee: group.payee,
      key,
      count: group.txns.length,
      total: Math.round(amounts.reduce((a, b) => a + b, 0) * 100) / 100,
      typical: Math.round(median(amounts) * 100) / 100,
      firstDate: firstTime !== undefined ? new Date(firstTime).toISOString().substring(0, 10) : '',
      lastDate: lastTime !== undefined ? new Date(lastTime).toISOString().substring(0, 10) : '',
      payeeType: classifyPayee(group.payee),
      suggestion:
        suggestionRow && suggestionCategory && suggestionRow.category_id
          ? {
              categoryId: suggestionRow.category_id,
              name: suggestionCategory.name,
              icon: suggestionCategory.icon,
              confidence:
                typeof suggestionRow.confidence === 'number'
                  ? suggestionRow.confidence
                  : parseFloat(String(suggestionRow.confidence ?? '0')) || 0,
              reason: suggestionRow.reason ?? undefined,
            }
          : null,
    })
  }

  return out.sort((a, b) => b.total - a.total)
}

export interface ResolveReviewInput {
  payee: string
  categoryId: string
  applyToAll: boolean
  label?: string | null
  txnId?: string
}

/**
 * Assign a category to a payee's transactions and write the permanent
 * source='user' cache rule (PRD 4.4 / 4.5).
 *
 * - applyToAll: every transaction of that payee (past and future defaults)
 * - txnId (without applyToAll): only that transaction
 * - otherwise: only that payee's transactions still waiting in review
 */
export async function resolveReviewGroup(
  supabase: SupabaseClient,
  userId: string,
  input: ResolveReviewInput
): Promise<{ updated: number }> {
  const payeeKey = normalizePayee(input.payee)

  // Validate the category is visible to this user (global or own).
  const { data: category } = await supabase
    .from('categories')
    .select('id')
    .eq('id', input.categoryId)
    .maybeSingle()
  if (!category) throw new Error('Unknown category')

  const { data: all } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)

  const matching = (all || []).filter(
    t => normalizePayee(t.merchant || '') === payeeKey
  )

  let targets: typeof matching
  if (input.applyToAll) {
    targets = matching
  } else if (input.txnId) {
    targets = matching.filter(t => t.id === input.txnId)
  } else {
    targets = matching.filter(t => t.needs_review === true)
  }

  if (targets.length === 0) return { updated: 0 }

  // Permanent rule: user-owned cache row — but only for payee-level
  // assignments. A single-transaction override must NOT become a rule
  // (PRD edge case 5).
  const singleTxnOnly = !input.applyToAll && !!input.txnId
  if (!singleTxnOnly) {
    const { data: cacheRows } = await supabase
      .from('merchant_category_cache')
      .select('*')
      .eq('user_id', userId)
    const existingRow = (cacheRows || []).find(
      c => normalizePayee(c.merchant_name) === payeeKey
    )

    const cachePayload: Record<string, unknown> = {
      // user_id must always be present: RLS WITH CHECK evaluates the row
      // proposed for insert, so an upsert of an existing row (by id) that
      // omits user_id fails with "new row violates row-level security policy".
      user_id: userId,
      ...(existingRow ? { id: existingRow.id } : {}),
      merchant_name: existingRow?.merchant_name || input.payee || matching[0]?.merchant || input.payee,
      category_id: input.categoryId,
      source: 'user',
      confidence: 1,
      payee_type: classifyPayee(input.payee),
      label: input.label ?? existingRow?.label ?? null,
    }

    let { error: cacheError } = await supabase
      .from('merchant_category_cache')
      .upsert(cachePayload, { onConflict: existingRow ? 'id' : 'user_id, merchant_name' })
    if (cacheError && isMissingColumn(cacheError)) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- strip new columns for the pre-migration fallback insert
      const { source: _s, payee_type: _p, label: _l, ...legacy } = cachePayload
      ;({ error: cacheError } = await supabase
        .from('merchant_category_cache')
        .upsert(legacy, { onConflict: existingRow ? 'id' : 'user_id, merchant_name' }))
    }
    if (cacheError) throw new Error(`Failed to save payee rule: ${cacheError.message}`)
  }

  const updatePayload: Record<string, unknown> = {
    category_id: input.categoryId,
    category_source: 'user',
    category_confidence: 1,
    needs_review: false,
  }

  const ids = targets.map(t => t.id)
  let { error } = await supabase.from('transactions').update(updatePayload).in('id', ids)
  if (error && isMissingColumn(error)) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- strip new columns for the pre-migration fallback update
    const { category_source: _s, category_confidence: _c, needs_review: _n, ...legacy } = updatePayload
    ;({ error } = await supabase.from('transactions').update(legacy).in('id', ids))
  }
  if (error) throw new Error(`Failed to update transactions: ${error.message}`)

  return { updated: ids.length }
}

export interface PayeeTxn {
  id: string
  date: string
  amount: number
  category_id: string | null
  needs_review: boolean
}

/** Transactions of one payee (used by the "only this transaction" path). */
export async function getPayeeTransactions(
  supabase: SupabaseClient,
  userId: string,
  payee: string
): Promise<PayeeTxn[]> {
  const payeeKey = normalizePayee(payee)
  const { data } = await supabase.from('transactions').select('*').eq('user_id', userId)

  return ((data || []) as ReviewTxnRow[])
    .filter(t => normalizePayee(t.merchant || '') === payeeKey)
    .sort(
      (a, b) => new Date(b.date || '').getTime() - new Date(a.date || '').getTime()
    )
    .map(t => ({
      id: t.id ?? '',
      date: t.date ?? '',
      amount: Number(t.amount ?? 0),
      category_id: t.category_id ?? null,
      needs_review: t.needs_review === true,
    }))
}
