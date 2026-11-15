import type { SupabaseClient } from '@supabase/supabase-js'
import { classifyPayee, normalizePayee, type PayeeType } from './payee'
import { applyDeterministicRules, directionOf } from './rules'
import { buildPayeeStats, type TxnForStats } from './stats'
import { categorizePayeesWithGemini, type GeminiPayeeResult } from '@/utils/gemini'

/** AI results at or above this confidence are applied; below goes to review (PRD 4.3). */
export const AI_CONFIDENCE_THRESHOLD = 0.8

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type AppliedSource = 'user' | 'rule' | 'ai'

export interface TxnRow {
  id: string
  merchant: string | null
  amount: number
  date: string
  txn_time?: string | null
  category_id?: string | null
  category_source?: string | null
  needs_review?: boolean
  payee_type?: string | null
}

export interface CacheRow {
  merchant_name: string
  category_id: string
  source?: string | null
  confidence?: number | string | null
  payee_type?: string | null
}

export interface CategoryRow {
  id: string
  name: string
}

export interface TxnUpdate {
  id: string
  applied?: {
    categoryId: string
    source: AppliedSource
    confidence: number
  }
  needsReview: boolean
  payeeType: PayeeType
}

export interface CacheUpsert {
  merchant_name: string
  category_id: string
  source: 'rule' | 'ai'
  confidence: number
  payee_type: PayeeType
}

export interface PendingGroup {
  key: string
  payee: string
  txns: TxnRow[]
}

export interface PlanInput {
  txns: TxnRow[]
  cache: CacheRow[]
  categories: CategoryRow[]
  /** Provided (even empty) = AI layer already attempted; undefined = return payees that still need AI. */
  aiResults?: Record<string, GeminiPayeeResult>
  threshold?: number
}

export interface PlanResult {
  updates: TxnUpdate[]
  review: TxnUpdate[]
  pending: PendingGroup[]
  cacheUpserts: CacheUpsert[]
  rejected: { payee: string; reason: string }[]
}

function cacheConfidence(row: CacheRow): number {
  if (typeof row.confidence === 'number') return row.confidence
  const parsed = parseFloat(String(row.confidence ?? '0'))
  return Number.isFinite(parsed) ? parsed : 0
}

/**
 * Pure 4-layer categorisation planner (PRD section 3):
 * 1. user/rule cache rows (AI cache rows only when confidence >= threshold)
 * 2. deterministic rules
 * 3. context-aware AI (when `aiResults` given)
 * 4. review queue
 *
 * With `aiResults === undefined`, payees without a layer-1/2 answer are
 * returned in `pending` instead of being flagged — the caller runs the AI
 * layer on them and plans again with only those transactions.
 */
export function planCategorisation(input: PlanInput): PlanResult {
  const threshold = input.threshold ?? AI_CONFIDENCE_THRESHOLD
  const categoryIds = new Set(input.categories.map(c => c.id))
  // Normalised keying; user-owned rows win over AI rows if both exist under
  // different casings of the same payee.
  const cacheMap = new Map<string, CacheRow>()
  for (const row of input.cache) {
    const key = normalizePayee(row.merchant_name)
    const existing = cacheMap.get(key)
    if (!existing || (row.source ?? 'ai') === 'user') cacheMap.set(key, row)
  }

  const groups = new Map<string, PendingGroup>()
  for (const txn of input.txns) {
    const payee = (txn.merchant || '').replace(/\s+/g, ' ').trim()
    if (!payee) continue
    const key = normalizePayee(payee)
    const existing = groups.get(key)
    if (existing) existing.txns.push(txn)
    else groups.set(key, { key, payee, txns: [txn] })
  }

  const result: PlanResult = {
    updates: [],
    review: [],
    pending: [],
    cacheUpserts: [],
    rejected: [],
  }

  const flagReview = (group: PendingGroup, payeeType: PayeeType) => {
    for (const txn of group.txns) {
      result.review.push({ id: txn.id, needsReview: true, payeeType })
    }
  }

  const applyCategory = (
    group: PendingGroup,
    payeeType: PayeeType,
    applied: NonNullable<TxnUpdate['applied']>
  ) => {
    for (const txn of group.txns) {
      result.updates.push({ id: txn.id, applied, needsReview: false, payeeType })
    }
  }

  for (const group of groups.values()) {
    const { payee, txns } = group
    const payeeType = classifyPayee(payee)
    const cached = cacheMap.get(group.key)

    // Layer 1: cache. user/rule always win; AI only when confident enough.
    if (cached && cached.category_id && categoryIds.has(cached.category_id)) {
      const source = cached.source ?? 'ai'
      if (source === 'user') {
        applyCategory(group, payeeType, {
          categoryId: cached.category_id,
          source: 'user',
          confidence: 1,
        })
        continue
      }
      if (source === 'rule') {
        applyCategory(group, payeeType, {
          categoryId: cached.category_id,
          source: 'rule',
          confidence: cacheConfidence(cached),
        })
        continue
      }
      const confidence = cacheConfidence(cached)
      if (confidence >= threshold) {
        applyCategory(group, payeeType, {
          categoryId: cached.category_id,
          source: 'ai',
          confidence,
        })
        continue
      }
      // Low-confidence AI suggestion already on record: human review.
      flagReview(group, payeeType)
      continue
    }

    // Layer 2: deterministic rules (no AI cost).
    const direction = directionOf(txns.map(t => t.amount))
    const rule = applyDeterministicRules(payeeType, direction, input.categories)
    if (rule) {
      applyCategory(group, payeeType, {
        categoryId: rule.categoryId,
        source: 'rule',
        confidence: rule.confidence,
      })
      result.cacheUpserts.push({
        merchant_name: payee,
        category_id: rule.categoryId,
        source: 'rule',
        confidence: rule.confidence,
        payee_type: payeeType,
      })
      continue
    }

    // Layer 3: AI — pending if we have not run it yet.
    if (input.aiResults === undefined) {
      result.pending.push(group)
      continue
    }

    const ai = input.aiResults[payee]
    const validCategoryId =
      ai?.category_id && UUID_RE.test(ai.category_id) && categoryIds.has(ai.category_id)
        ? ai.category_id
        : null

    if (ai?.category_id && !validCategoryId) {
      result.rejected.push({
        payee,
        reason: UUID_RE.test(ai.category_id)
          ? 'category_id not in user category list'
          : 'category_id is not a valid UUID',
      })
    }

    if (validCategoryId && ai) {
      result.cacheUpserts.push({
        merchant_name: payee,
        category_id: validCategoryId,
        source: 'ai',
        confidence: ai.confidence,
        payee_type: payeeType,
      })
      if (ai.confidence >= threshold) {
        applyCategory(group, payeeType, {
          categoryId: validCategoryId,
          source: 'ai',
          confidence: ai.confidence,
        })
        continue
      }
    }

    // Layer 4: everything else needs human review.
    flagReview(group, payeeType)
  }

  return result
}

export function isMissingColumn(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  return error.code === '42703' || /column .* does not exist/i.test(error.message || '')
}

interface UpdatePayload {
  [key: string]: unknown
}

function buildPayload(update: TxnUpdate): UpdatePayload | null {
  const base: UpdatePayload = { needs_review: update.needsReview, payee_type: update.payeeType }
  if (update.applied) {
    base.category_id = update.applied.categoryId
    base.category_source = update.applied.source
    base.category_confidence = update.applied.confidence
  } else if (!update.needsReview) {
    return null
  }
  return base
}

async function applyUpdates(supabase: SupabaseClient, updates: TxnUpdate[]): Promise<string[]> {
  const buckets = new Map<string, { payload: UpdatePayload; ids: string[] }>()

  for (const update of updates) {
    const payload = buildPayload(update)
    if (!payload) continue
    const key = JSON.stringify(payload)
    const bucket = buckets.get(key)
    if (bucket) bucket.ids.push(update.id)
    else buckets.set(key, { payload, ids: [update.id] })
  }

  const updatedIds: string[] = []
  let warnedMissingColumn = false

  for (const { payload, ids } of buckets.values()) {
    for (let i = 0; i < ids.length; i += 500) {
      const chunk = ids.slice(i, i + 500)
      const { error } = await supabase.from('transactions').update(payload).in('id', chunk)
      if (!error) {
        updatedIds.push(...chunk)
        continue
      }
      if (isMissingColumn(error) && !warnedMissingColumn) {
        warnedMissingColumn = true
        console.warn(
          'Categorisation columns missing — run the payee-categorisation section of supabase_setup.sql. Falling back to legacy update.'
        )
      }
      if ('category_id' in payload) {
        const legacy = { category_id: payload.category_id }
        const { error: legacyError } = await supabase
          .from('transactions')
          .update(legacy)
          .in('id', chunk)
        if (!legacyError) updatedIds.push(...chunk)
        else console.error('Transaction update failed:', legacyError)
      }
    }
  }

  return updatedIds
}

async function upsertCacheRows(
  supabase: SupabaseClient,
  userId: string,
  rows: CacheUpsert[],
  cache: CacheRow[]
): Promise<void> {
  if (rows.length === 0) return

  const userOwnedKeys = new Set(
    cache
      .filter(c => (c.source ?? 'ai') === 'user')
      .map(c => normalizePayee(c.merchant_name))
  )

  const deduped = new Map<string, CacheUpsert>()
  for (const row of rows) {
    const key = normalizePayee(row.merchant_name)
    if (userOwnedKeys.has(key)) continue // never overwrite a user-owned rule
    if (!deduped.has(key)) deduped.set(key, row)
  }
  if (deduped.size === 0) return

  const payload = [...deduped.values()].map(row => ({
    user_id: userId,
    merchant_name: row.merchant_name,
    category_id: row.category_id,
    source: row.source,
    confidence: row.confidence,
    payee_type: row.payee_type,
  }))

  const { error } = await supabase
    .from('merchant_category_cache')
    .upsert(payload, { onConflict: 'user_id, merchant_name' })
  if (error) {
    if (isMissingColumn(error)) {
      console.warn('merchant_category_cache migration missing — run supabase_setup.sql section 14.')
      const legacy = payload.map(({ user_id, merchant_name, category_id, confidence }) => ({
        user_id, merchant_name, category_id, confidence,
      }))
      await supabase
        .from('merchant_category_cache')
        .upsert(legacy, { onConflict: 'user_id, merchant_name' })
    } else {
      console.error('Cache upsert failed:', error)
    }
  }
}

export interface PipelineResult {
  categorised: number
  flagged: number
  updatedIds: string[]
  pendingReview: number
}

/**
 * Runs the full 4-layer pipeline over all uncategorised, not-yet-flagged
 * transactions of a user (PRD section 3 / phase 2).
 */
export async function runCategorisationPipeline(
  supabase: SupabaseClient,
  userId: string
): Promise<PipelineResult> {
  const [{ data: txnRows }, { data: cacheRows }, { data: categoryRows }] = await Promise.all([
    supabase.from('transactions').select('*').eq('user_id', userId).is('category_id', null),
    supabase.from('merchant_category_cache').select('*').eq('user_id', userId),
    supabase.from('categories').select('id, name').order('name'),
  ])

  const allTxns: TxnRow[] = txnRows || []
  const cache: CacheRow[] = cacheRows || []
  const categories: CategoryRow[] = categoryRows || []

  const targets = allTxns.filter(t => t.needs_review !== true && t.category_source !== 'user')

  const preFlagged = allTxns.filter(t => t.needs_review === true).length
  if (targets.length === 0) {
    return { categorised: 0, flagged: 0, updatedIds: [], pendingReview: preFlagged }
  }

  const stage1 = planCategorisation({ txns: targets, cache, categories })
  let updates = stage1.updates
  let review = stage1.review
  const cacheUpserts = [...stage1.cacheUpserts]
  const rejected = [...stage1.rejected]
  let pending = stage1.pending

  if (pending.length > 0) {
    // Behavioural context for the AI layer is built from the payee's full history.
    const { data: historyRows } = await supabase
      .from('transactions')
      .select('merchant, amount, date, txn_time')
      .eq('user_id', userId)

    const historyByKey = new Map<string, TxnForStats[]>()
    for (const row of historyRows || []) {
      if (!row.merchant) continue
      const key = normalizePayee(row.merchant)
      const list = historyByKey.get(key)
      const statsRow: TxnForStats = {
        amount: Number(row.amount),
        date: row.date,
        txn_time: row.txn_time,
      }
      if (list) list.push(statsRow)
      else historyByKey.set(key, [statsRow])
    }

    const contexts = pending.map(group => ({
      group,
      context: buildPayeeStats(
        group.payee,
        classifyPayee(group.payee),
        historyByKey.get(group.key) ?? group.txns.map(t => ({
          amount: Number(t.amount),
          date: t.date,
          txn_time: t.txn_time,
        }))
      ),
    }))

    const aiResults = await categorizePayeesWithGemini(contexts.map(c => c.context), categories)

    const stage2 = planCategorisation({
      txns: pending.flatMap(g => g.txns),
      cache,
      categories,
      aiResults,
    })
    updates = [...updates, ...stage2.updates]
    review = [...review, ...stage2.review]
    cacheUpserts.push(...stage2.cacheUpserts)
    rejected.push(...stage2.rejected)
    pending = stage2.pending // always empty when aiResults is provided
  }

  for (const item of rejected) {
    console.warn(`AI categorisation rejected for payee "${item.payee}": ${item.reason}`)
  }

  const updatedIds = await applyUpdates(supabase, updates)
  await applyUpdates(supabase, review)
  await upsertCacheRows(supabase, userId, cacheUpserts, cache)

  return {
    categorised: updates.length,
    flagged: review.length,
    updatedIds,
    pendingReview: preFlagged + review.length,
  }
}
