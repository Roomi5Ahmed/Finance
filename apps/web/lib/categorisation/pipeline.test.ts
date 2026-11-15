import { describe, expect, it } from 'vitest'
import {
  AI_CONFIDENCE_THRESHOLD,
  planCategorisation,
  type CacheRow,
  type TxnRow,
} from './pipeline'

const TRANSPORT = '11111111-1111-1111-1111-111111111111'
const PERSONAL = '22222222-2222-2222-2222-222222222222'
const INCOME = '33333333-3333-3333-3333-333333333333'
const NOT_OURS = '99999999-9999-4999-8999-999999999999'

const categories = [
  { id: TRANSPORT, name: 'Transportation' },
  { id: PERSONAL, name: 'Personal Transfers' },
  { id: INCOME, name: 'Income' },
]

let seq = 0
function txn(overrides: Partial<TxnRow> & { merchant: string; amount: number }): TxnRow {
  seq++
  return {
    id: `tx-${seq}`,
    date: '2026-08-02T09:12:00.000Z',
    ...overrides,
  }
}

describe('planCategorisation precedence (PRD section 3)', () => {
  it('layer 1: a user cache rule wins over a confident AI result, even on name variants', () => {
    const txns = [txn({ merchant: 'RAMESH KUMAR', amount: -60 })]
    const cache: CacheRow[] = [
      { merchant_name: 'Ramesh Kumar', category_id: TRANSPORT, source: 'user', confidence: 1 },
    ]

    const plan = planCategorisation({
      txns,
      cache,
      categories,
      aiResults: { 'RAMESH KUMAR': { category_id: INCOME, confidence: 0.99 } },
    })

    expect(plan.updates).toHaveLength(1)
    expect(plan.updates[0]?.applied).toEqual({
      categoryId: TRANSPORT,
      source: 'user',
      confidence: 1,
    })
    expect(plan.review).toHaveLength(0)
    expect(plan.cacheUpserts).toHaveLength(0)
  })

  it('layer 1: applies a confident cached AI row without calling AI again', () => {
    const txns = [txn({ merchant: 'Uber Rides', amount: -450 })]
    const cache: CacheRow[] = [
      { merchant_name: 'Uber Rides', category_id: TRANSPORT, source: 'ai', confidence: 0.9 },
    ]

    const plan = planCategorisation({ txns, cache, categories, aiResults: {} })

    expect(plan.updates[0]?.applied).toEqual({
      categoryId: TRANSPORT,
      source: 'ai',
      confidence: 0.9,
    })
    expect(plan.review).toHaveLength(0)
  })

  it('treats legacy cache rows without a source as AI rows', () => {
    const txns = [txn({ merchant: 'Zomato', amount: -650 })]
    const cache: CacheRow[] = [
      { merchant_name: 'Zomato', category_id: TRANSPORT, confidence: 0.9 },
    ]

    const plan = planCategorisation({ txns, cache, categories, aiResults: {} })

    expect(plan.updates[0]?.applied?.source).toBe('ai')
    expect(plan.review).toHaveLength(0)
  })

  it('layer 1: a below-threshold cached AI suggestion goes to review, not applied', () => {
    const txns = [txn({ merchant: 'Unknown Store Co', amount: -100 })]
    const cache: CacheRow[] = [
      { merchant_name: 'Unknown Store Co', category_id: TRANSPORT, source: 'ai', confidence: 0.5 },
    ]

    const plan = planCategorisation({ txns, cache, categories, aiResults: {} })

    expect(plan.updates).toHaveLength(0)
    expect(plan.review).toHaveLength(1)
    expect(plan.review[0]?.needsReview).toBe(true)
  })

  it('layer 2: a person-to-person credit defaults to Personal Transfers', () => {
    const txns = [txn({ merchant: 'Ramesh Kumar', amount: 500 })]

    const plan = planCategorisation({ txns, cache: [], categories, aiResults: {} })

    expect(plan.updates[0]?.applied).toEqual({
      categoryId: PERSONAL,
      source: 'rule',
      confidence: 0.95,
    })
    expect(plan.cacheUpserts[0]).toMatchObject({
      merchant_name: 'Ramesh Kumar',
      category_id: PERSONAL,
      source: 'rule',
    })
    expect(plan.review).toHaveLength(0)
  })

  it('layer 2: person debits are NOT hard-routed — they await AI', () => {
    const txns = [txn({ merchant: 'Ramesh Kumar', amount: -60 })]

    const beforeAI = planCategorisation({ txns, cache: [], categories })
    expect(beforeAI.pending.map(p => p.payee)).toEqual(['Ramesh Kumar'])
    expect(beforeAI.updates).toHaveLength(0)

    const afterAI = planCategorisation({ txns, cache: [], categories, aiResults: {} })
    expect(afterAI.pending).toHaveLength(0)
    expect(afterAI.review).toHaveLength(1)
  })

  it('layer 3: confident AI results are applied and cached with their confidence', () => {
    const txns = [txn({ merchant: 'Ramesh Kumar', amount: -60 })]
    expect(AI_CONFIDENCE_THRESHOLD).toBe(0.8)

    const plan = planCategorisation({
      txns,
      cache: [],
      categories,
      aiResults: { 'Ramesh Kumar': { category_id: TRANSPORT, confidence: 0.85, reason: 'commute' } },
    })

    expect(plan.updates[0]?.applied).toEqual({
      categoryId: TRANSPORT,
      source: 'ai',
      confidence: 0.85,
    })
    expect(plan.cacheUpserts[0]).toMatchObject({
      source: 'ai',
      confidence: 0.85,
      category_id: TRANSPORT,
    })
    expect(plan.review).toHaveLength(0)
  })

  it('layer 3: below-threshold AI results are flagged for review but kept as a suggestion', () => {
    const txns = [txn({ merchant: 'Ramesh Kumar', amount: -60 })]

    const plan = planCategorisation({
      txns,
      cache: [],
      categories,
      aiResults: { 'Ramesh Kumar': { category_id: TRANSPORT, confidence: 0.6 } },
    })

    expect(plan.updates).toHaveLength(0)
    expect(plan.review).toHaveLength(1)
    expect(plan.cacheUpserts).toHaveLength(1)
    expect(plan.cacheUpserts[0]?.confidence).toBe(0.6)
  })

  it('rejects AI category ids outside the user list (logged, never applied)', () => {
    const txns = [txn({ merchant: 'Ramesh Kumar', amount: -60 })]

    const plan = planCategorisation({
      txns,
      cache: [],
      categories,
      aiResults: { 'Ramesh Kumar': { category_id: NOT_OURS, confidence: 0.99 } },
    })

    expect(plan.updates).toHaveLength(0)
    expect(plan.review).toHaveLength(1)
    expect(plan.cacheUpserts).toHaveLength(0)
    expect(plan.rejected).toHaveLength(1)
    expect(plan.rejected[0]?.reason).toContain('not in user category list')
  })

  it('rejects non-UUID category ids', () => {
    const txns = [txn({ merchant: 'Ramesh Kumar', amount: -60 })]

    const plan = planCategorisation({
      txns,
      cache: [],
      categories,
      aiResults: { 'Ramesh Kumar': { category_id: 'Transport', confidence: 0.99 } },
    })

    expect(plan.updates).toHaveLength(0)
    expect(plan.rejected[0]?.reason).toContain('not a valid UUID')
  })

  it('flags every transaction of a payee together', () => {
    const txns = [
      txn({ merchant: 'Ramesh Kumar', amount: -60 }),
      txn({ merchant: 'ramesh  kumar', amount: -80 }),
      txn({ merchant: 'RAMESH KUMAR', amount: -60 }),
    ]

    const plan = planCategorisation({ txns, cache: [], categories, aiResults: {} })

    expect(plan.review).toHaveLength(3)
    expect(new Set(plan.review.map(r => r.payeeType))).toEqual(new Set(['person']))
  })
})
