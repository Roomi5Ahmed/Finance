import { describe, expect, it } from 'vitest'
import {
  buildCategoryBreakdown,
  buildDailySeries,
  currentMonthKey,
  monthDay,
  monthRange,
  shiftMonth,
  summarize,
  type MonthTxnRow,
} from './dashboard'

describe('monthRange', () => {
  it('handles a 31-day month with IST half-open bounds', () => {
    const r = monthRange('2026-01')
    expect(r).not.toBeNull()
    expect(r!.days).toBe(31)
    expect(r!.startDate).toBe('2026-01-01')
    expect(r!.endDate).toBe('2026-02-01')
    // IST midnight (UTC+05:30) as UTC instants
    expect(r!.startISO).toBe('2025-12-31T18:30:00.000Z')
    expect(r!.endISO).toBe('2026-01-31T18:30:00.000Z')
    expect(r!.label).toBe('January 2026')
  })

  it('handles a 30-day month', () => {
    const r = monthRange('2026-04')
    expect(r!.days).toBe(30)
    expect(r!.endDate).toBe('2026-05-01')
    expect(r!.startISO).toBe('2026-03-31T18:30:00.000Z')
    expect(r!.endISO).toBe('2026-04-30T18:30:00.000Z')
  })

  it('handles February in a common year (28 days)', () => {
    const r = monthRange('2026-02')
    expect(r!.days).toBe(28)
    expect(r!.endDate).toBe('2026-03-01')
    expect(r!.endISO).toBe('2026-02-28T18:30:00.000Z')
  })

  it('handles February in a leap year (29 days)', () => {
    const r = monthRange('2024-02')
    expect(r!.days).toBe(29)
    expect(r!.endDate).toBe('2024-03-01')
    expect(r!.endISO).toBe('2024-02-29T18:30:00.000Z')
  })

  it('rolls the end date across a year boundary', () => {
    const r = monthRange('2026-12')
    expect(r!.endDate).toBe('2027-01-01')
    expect(r!.endISO).toBe('2026-12-31T18:30:00.000Z')
  })

  it('rejects invalid month keys', () => {
    expect(monthRange('2026-13')).toBeNull()
    expect(monthRange('2026-0')).toBeNull()
    expect(monthRange('2026-1')).toBeNull()
    expect(monthRange('abc')).toBeNull()
    expect(monthRange('2026-1-01')).toBeNull()
  })
})

describe('currentMonthKey', () => {
  it('rolls to the next month at IST midnight', () => {
    // 2026-11-30 23:29 IST
    expect(currentMonthKey(new Date('2026-11-30T17:59:00Z'))).toBe('2026-11')
    // 2026-11-30 23:59 IST
    expect(currentMonthKey(new Date('2026-11-30T18:29:00Z'))).toBe('2026-11')
    // 2026-12-01 00:01 IST
    expect(currentMonthKey(new Date('2026-11-30T18:31:00Z'))).toBe('2026-12')
  })

  it('rolls backwards at the start of a month', () => {
    // 2026-11-01 00:01 IST = 2026-10-31 18:31 UTC
    expect(currentMonthKey(new Date('2026-10-31T18:31:00Z'))).toBe('2026-11')
    // 2026-10-31 23:59 IST
    expect(currentMonthKey(new Date('2026-10-31T18:29:00Z'))).toBe('2026-10')
  })
})

describe('monthDay', () => {
  it('maps instants to IST calendar days', () => {
    expect(monthDay('2026-11-30T18:31:00Z')).toBe(1) // 00:01 IST on the 1st
    expect(monthDay('2026-11-30T18:29:00Z')).toBe(30) // 23:59 IST on the 30th
    expect(monthDay('2026-02-28T18:31:00Z')).toBe(1) // leap-year edge: Mar 1 00:01 IST
  })
})

describe('shiftMonth', () => {
  it('shifts across year boundaries', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12')
    expect(shiftMonth('2026-12', 1)).toBe('2027-01')
    expect(shiftMonth('2026-06', 0)).toBe('2026-06')
    expect(shiftMonth('2026-01', -13)).toBe('2024-12')
  })

  it('throws on invalid input', () => {
    expect(() => shiftMonth('nope', 1)).toThrow()
  })
})

describe('summarize', () => {
  it('splits income and expenses and reports net', () => {
    const totals = summarize([
      { amount: 1000.5 },
      { amount: -200 },
      { amount: -50.25 },
      { amount: 0 },
    ])
    expect(totals.income).toBe(1000.5)
    expect(totals.expenses).toBe(250.25)
    expect(totals.net).toBe(750.25)
    expect(totals.count).toBe(4)
  })

  it('returns zeros for an empty month', () => {
    expect(summarize([])).toEqual({ income: 0, expenses: 0, net: 0, count: 0 })
  })
})

describe('buildDailySeries', () => {
  it('returns a zero-filled series of the right length for an empty month', () => {
    const r = monthRange('2026-03')!
    const series = buildDailySeries([], r)
    expect(series).toHaveLength(31)
    expect(series.every(p => p.value === 0)).toBe(true)
    expect(series.map(p => p.day)).toEqual(Array.from({ length: 31 }, (_, i) => i + 1))
  })

  it('buckets expenses by IST day, including first/last day edges', () => {
    const r = monthRange('2026-03')!
    const series = buildDailySeries(
      [
        { date: '2026-02-28T18:31:00Z', amount: -100 }, // Mar 1 00:01 IST
        { date: '2026-03-31T18:29:00Z', amount: -50 }, // Mar 31 23:59 IST
        { date: '2026-03-15T07:00:00Z', amount: -30 }, // Mar 15 midday IST
      ],
      r
    )
    expect(series[0]!.value).toBe(100)
    expect(series[14]!.value).toBe(30)
    expect(series[30]!.value).toBe(50)
    expect(series[1]!.value).toBe(0)
    expect(series.reduce((s, p) => s + p.value, 0)).toBe(180)
  })

  it('ignores income rows', () => {
    const r = monthRange('2026-03')!
    const series = buildDailySeries([{ date: '2026-03-15T07:00:00Z', amount: 999 }], r)
    expect(series.every(p => p.value === 0)).toBe(true)
  })

  it('handles February lengths in both leap and common years', () => {
    expect(buildDailySeries([], monthRange('2026-02')!)).toHaveLength(28)
    expect(buildDailySeries([], monthRange('2024-02')!)).toHaveLength(29)
  })
})

describe('buildCategoryBreakdown', () => {
  const txns: MonthTxnRow[] = [
    { id: '1', date: '2026-11-05T10:00:00Z', amount: -400, merchant: 'A', category_id: 'cat-food', categories: { name: 'Food', icon: '🍽️', color: '#fff' } },
    { id: '2', date: '2026-11-06T10:00:00Z', amount: -600, merchant: 'B', category_id: 'cat-food', categories: { name: 'Food', icon: '🍽️', color: '#fff' } },
    { id: '3', date: '2026-11-07T10:00:00Z', amount: -150, merchant: 'C', category_id: 'cat-transport', categories: { name: 'Transport', icon: '🚌', color: '#eee' } },
    { id: '4', date: '2026-11-08T10:00:00Z', amount: -90, merchant: 'D', category_id: null, categories: null },
    { id: '5', date: '2026-11-09T10:00:00Z', amount: 5000, merchant: 'Salary', category_id: null, categories: null },
  ]

  it('reconciles: sum of category slices equals month expenses', () => {
    const totals = summarize(txns)
    const slices = buildCategoryBreakdown(txns)
    const sliceTotal = slices.reduce((s, c) => s + c.value, 0)
    expect(sliceTotal).toBe(totals.expenses)
    expect(sliceTotal).toBe(1240)
  })

  it('groups by category and sorts by spend descending', () => {
    const slices = buildCategoryBreakdown(txns)
    expect(slices.map(s => s.name)).toEqual(['Food', 'Transport', 'Uncategorised'])
    expect(slices[0]!.value).toBe(1000)
    expect(slices[0]!.count).toBe(2)
    expect(slices[2]!.value).toBe(90)
  })

  it('includes an Uncategorised slice so totals still reconcile', () => {
    const slices = buildCategoryBreakdown(txns)
    const uncategorised = slices.find(s => s.categoryId === null)
    expect(uncategorised).toBeDefined()
    expect(uncategorised!.name).toBe('Uncategorised')
    expect(uncategorised!.icon).toBe('❔')
  })

  it('ignores income and handles an empty month', () => {
    expect(buildCategoryBreakdown([])).toEqual([])
    const onlyIncome = buildCategoryBreakdown([
      { id: '1', date: '2026-11-05T10:00:00Z', amount: 100, merchant: 'X', category_id: null, categories: null },
    ])
    expect(onlyIncome).toEqual([])
  })

  it('keeps the same-name different-category slices apart', () => {
    const slices = buildCategoryBreakdown([
      { id: '1', date: '2026-11-05T10:00:00Z', amount: -10, merchant: 'A', category_id: 'x', categories: { name: 'Same', icon: null, color: null } },
      { id: '2', date: '2026-11-06T10:00:00Z', amount: -20, merchant: 'B', category_id: 'y', categories: { name: 'Same', icon: null, color: null } },
    ])
    expect(slices).toHaveLength(2)
    expect(slices.reduce((s, c) => s + c.value, 0)).toBe(30)
  })
})
