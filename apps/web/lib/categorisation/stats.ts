import type { PayeeType } from './payee'
import { directionOf, type Direction } from './rules'

export interface TxnForStats {
  amount: number
  date: string
  txn_time?: string | null
}

/** Per-payee context object sent to the AI layer (see PRD 4.3). */
export interface PayeeContext {
  payee: string
  payee_type_guess: PayeeType
  txn_count: number
  amounts: number[]
  typical_amount: number
  total: number
  direction: Direction
  time_of_day_buckets?: Record<string, number>
  weekday_pattern?: string
  date_range: string
  hints: string[]
}

const TIME_BUCKET_ORDER = ['morning', 'afternoon', 'evening', 'night'] as const

function timeBucket(txnTime: string | null | undefined): string | null {
  if (!txnTime) return null
  const m = /^(\d{1,2}):(\d{2})/.exec(txnTime)
  if (!m) return null
  const hour = parseInt(m[1] ?? '', 10)
  if (Number.isNaN(hour)) return null
  if (hour >= 5 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 17) return 'afternoon'
  if (hour >= 17 && hour < 21) return 'evening'
  return 'night'
}

function weekdayPattern(counts: number[]): string | undefined {
  const total = counts.reduce((a, b) => a + b, 0)
  if (total < 4) return undefined
  const weekdayCount =
    (counts[1] ?? 0) + (counts[2] ?? 0) + (counts[3] ?? 0) + (counts[4] ?? 0) + (counts[5] ?? 0)
  const weekendCount = (counts[0] ?? 0) + (counts[6] ?? 0)
  if (weekdayCount / total >= 0.7) return 'Mon-Fri mostly'
  if (weekendCount / total >= 0.7) return 'Weekends mostly'
  return undefined
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 1) return sorted[mid] ?? 0
  return ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2
}

function buildHints(absAmounts: number[]): string[] {
  const hints: string[] = []
  if (absAmounts.length === 0) return hints

  const typical = median(absAmounts)
  const smallRound = absAmounts.filter(a => a < 500 && a % 50 === 0)
  if (absAmounts.length >= 3 && smallRound.length / absAmounts.length >= 0.6) {
    hints.push('small round amounts under 500')
  }

  const rounded = absAmounts.map(a => Math.round(a / 10) * 10)
  const counts = new Map<number, number>()
  for (const r of rounded) counts.set(r, (counts.get(r) || 0) + 1)
  const repeated = [...counts.values()].some(c => c >= 3)
  if (repeated) hints.push('same amount repeated 3+ times')

  if (typical >= 10000 && typical % 1000 === 0) {
    hints.push('large round amount (rent/salary/loan style)')
  }

  if (absAmounts.some(a => a >= 50000)) {
    hints.push('contains a very large amount')
  }

  return hints
}

/**
 * Build the compact behavioural context for one payee from its transactions.
 * Used as a hint source for the AI layer — not a hard-rule input.
 */
export function buildPayeeStats(
  payee: string,
  payeeType: PayeeType,
  txns: TxnForStats[]
): PayeeContext {
  const sorted = [...txns].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )
  const amounts = sorted.map(t => t.amount)
  const absAmounts = amounts.map(Math.abs)

  const recentAmounts = sorted
    .slice(0, 5)
    .map(t => Math.round(Math.abs(t.amount) * 100) / 100)
    .reverse()

  const buckets: Record<string, number> = {}
  for (const t of sorted) {
    const bucket = timeBucket(t.txn_time)
    if (bucket) buckets[bucket] = (buckets[bucket] || 0) + 1
  }
  const orderedBuckets: Record<string, number> = {}
  for (const key of TIME_BUCKET_ORDER) {
    if (buckets[key]) orderedBuckets[key] = buckets[key]
  }

  const weekdayCounts = [0, 0, 0, 0, 0, 0, 0]
  for (const t of sorted) {
    const d = new Date(t.date)
    if (!isNaN(d.getTime())) {
      const day = d.getDay()
      weekdayCounts[day] = (weekdayCounts[day] ?? 0) + 1
    }
  }

  const first = sorted[sorted.length - 1]
  const last = sorted[0]
  const fmt = (d: string) => {
    const parsed = new Date(d)
    return isNaN(parsed.getTime()) ? null : parsed.toISOString().substring(0, 10)
  }
  const start = first ? fmt(first.date) : null
  const end = last ? fmt(last.date) : null

  const total = Math.round(absAmounts.reduce((a, b) => a + b, 0) * 100) / 100

  const context: PayeeContext = {
    payee,
    payee_type_guess: payeeType,
    txn_count: sorted.length,
    amounts: recentAmounts,
    typical_amount: Math.round(median(absAmounts) * 100) / 100,
    total,
    direction: directionOf(amounts),
    date_range: start && end ? `${start}..${end}` : 'unknown',
    hints: buildHints(absAmounts),
  }

  if (Object.keys(orderedBuckets).length > 0) context.time_of_day_buckets = orderedBuckets
  const pattern = weekdayPattern(weekdayCounts)
  if (pattern) context.weekday_pattern = pattern

  return context
}
