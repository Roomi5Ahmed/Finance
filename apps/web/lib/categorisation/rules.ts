import type { PayeeType } from './payee'

export const PERSONAL_TRANSFERS_CATEGORY = 'Personal Transfers'

export interface RuleResult {
  categoryId: string
  confidence: number
  reason: string
}

export type Direction = 'debit' | 'credit' | 'mixed'

export function directionOf(amounts: number[]): Direction {
  if (amounts.length === 0) return 'debit'
  const allCredit = amounts.every(a => a > 0)
  const allDebit = amounts.every(a => a < 0)
  if (allCredit) return 'credit'
  if (allDebit) return 'debit'
  return 'mixed'
}

/**
 * Deterministic (non-AI) rules — layer 2 of the pipeline.
 * Deliberately conservative: only assign when the answer is unambiguous.
 */
export function applyDeterministicRules(
  payeeType: PayeeType,
  direction: Direction,
  categories: { id: string; name: string }[]
): RuleResult | null {
  // A credit from a person is a transfer/reimbursement, never "income".
  if (payeeType === 'person' && direction === 'credit') {
    const target = categories.find(
      c => c.name.trim().toLowerCase() === PERSONAL_TRANSFERS_CATEGORY.toLowerCase()
    )
    if (target) {
      return {
        categoryId: target.id,
        confidence: 0.95,
        reason: 'Person-to-person credit defaults to Personal Transfers',
      }
    }
  }

  return null
}
