import type { SupabaseClient } from '@supabase/supabase-js'
import { normalizeMerchant } from './subscriptions'
import { getBudgetsForPeriod, type BudgetWithSpend } from './budgets'

export const DEFAULT_TZ = 'Asia/Kolkata'
export const TZ_OFFSET_MINUTES = 330 // Asia/Kolkata: UTC+05:30, no DST

const MONTH_RE = /^(\d{4})-(0[1-9]|1[0-2])$/

export interface MonthRange {
  month: string
  year: number
  monthIndex: number
  days: number
  /** Local first day of the month (YYYY-MM-DD) */
  startDate: string
  /** Local first day of the NEXT month (YYYY-MM-DD) — half-open end */
  endDate: string
  /** Half-open UTC instants covering the local month */
  startISO: string
  endISO: string
  label: string
  shortLabel: string
}

export function monthRange(month: string): MonthRange | null {
  const m = MONTH_RE.exec(month)
  if (!m) return null
  const year = Number(m[1])
  const monthIndex = Number(m[2]) - 1
  const pad = (n: number) => String(n).padStart(2, '0')
  const utcStart = Date.UTC(year, monthIndex, 1)
  const utcEnd = Date.UTC(year, monthIndex + 1, 1)
  return {
    month,
    year,
    monthIndex,
    days: Math.round((utcEnd - utcStart) / 86_400_000),
    startDate: `${year}-${pad(monthIndex + 1)}-01`,
    endDate: `${monthIndex + 1 === 12 ? `${year + 1}-01` : `${year}-${pad(monthIndex + 2)}`}-01`,
    startISO: new Date(utcStart - TZ_OFFSET_MINUTES * 60_000).toISOString(),
    endISO: new Date(utcEnd - TZ_OFFSET_MINUTES * 60_000).toISOString(),
    label: new Date(utcStart).toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' }),
    shortLabel: new Date(utcStart).toLocaleDateString('en-IN', { month: 'short', year: 'numeric', timeZone: 'UTC' }),
  }
}

export function currentMonthKey(now: Date = new Date()): string {
  const shifted = new Date(now.getTime() + TZ_OFFSET_MINUTES * 60_000)
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}`
}

export function shiftMonth(month: string, delta: number): string {
  const m = MONTH_RE.exec(month)
  if (!m) throw new Error(`Invalid month: ${month}`)
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1 + delta, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

export function monthLabel(month: string): string {
  const range = monthRange(month)
  if (!range) return month
  return range.label
}

/** Day of month (1..31) of an instant, in the app's local timezone. */
export function monthDay(date: string): number {
  return new Date(new Date(date).getTime() + TZ_OFFSET_MINUTES * 60_000).getUTCDate()
}

export interface KpiTotals {
  income: number
  expenses: number
  net: number
  count: number
}

export function summarize(txns: { amount: number }[]): KpiTotals {
  let income = 0
  let expenses = 0
  for (const t of txns) {
    const a = Number(t.amount) || 0
    if (a > 0) income += a
    else if (a < 0) expenses += -a
  }
  const round = (n: number) => Math.round(n * 100) / 100
  return { income: round(income), expenses: round(expenses), net: round(income - expenses), count: txns.length }
}

export interface DailyPoint {
  day: number
  value: number
}

export function buildDailySeries(txns: { date: string; amount: number }[], range: MonthRange): DailyPoint[] {
  const values: number[] = new Array<number>(range.days).fill(0)
  for (const t of txns) {
    if (t.amount >= 0) continue
    const day = monthDay(t.date)
    if (day >= 1 && day <= range.days) {
      values[day - 1] = (values[day - 1] ?? 0) + Math.abs(Number(t.amount) || 0)
    }
  }
  return values.map((v, i) => ({ day: i + 1, value: Math.round(v * 100) / 100 }))
}

export interface MonthTxnRow {
  id: string
  date: string
  amount: number
  merchant: string | null
  category_id: string | null
  needs_review?: boolean | null
  categories?: { name?: string | null; icon?: string | null; color?: string | null } | null
}

export interface CategorySlice {
  categoryId: string | null
  name: string
  icon: string | null
  color: string | null
  value: number
  count: number
}

const UNCATEGORISED_KEY = 'uncategorised'

export function buildCategoryBreakdown(txns: MonthTxnRow[]): CategorySlice[] {
  const map = new Map<string, CategorySlice>()
  for (const t of txns) {
    if (t.amount >= 0) continue
    const key = t.category_id || UNCATEGORISED_KEY
    const existing = map.get(key)
    if (existing) {
      existing.value += Math.abs(Number(t.amount) || 0)
      existing.count += 1
    } else {
      map.set(key, {
        categoryId: t.category_id,
        name: t.categories?.name || 'Uncategorised',
        icon: t.categories?.icon || (t.category_id ? null : '❔'),
        color: t.categories?.color || '#64748B',
        value: Math.abs(Number(t.amount) || 0),
        count: 1,
      })
    }
  }
  const slices = [...map.values()]
  for (const s of slices) s.value = Math.round(s.value * 100) / 100
  return slices.sort((a, b) => b.value - a.value)
}

interface MonthlySummaryRow {
  month: string
  income: number
  expenses: number
  txn_count: number
}

interface CategorySummaryRow {
  category_id: string | null
  spent: number
  txn_count?: number
}

interface MonthlyCategoryRow {
  month: string
  category_id: string | null
  spent: number
}

function isMissingRpc(error: { message?: string; code?: string } | null | undefined): boolean {
  if (!error) return false
  if (error.code === 'PGRST202' || error.code === '42883') return true
  return /monthly_summary|category_summary|monthly_category_summary/.test(error.message || '')
}

async function fetchMonthlySummary(
  supabase: SupabaseClient,
  userId: string,
  startDate: string,
  endDate: string
): Promise<MonthlySummaryRow[]> {
  const { data, error } = await supabase.rpc('monthly_summary', {
    p_user: userId,
    p_start: startDate,
    p_end: endDate,
    p_tz: DEFAULT_TZ,
  })
  if (error) {
    if (isMissingRpc(error)) {
      console.warn('monthly_summary function missing - run supabase_setup.sql section 16.')
      return []
    }
    throw new Error(error.message)
  }
  return ((data || []) as MonthlySummaryRow[]).map(r => ({
    month: String(r.month).slice(0, 7),
    income: Number(r.income) || 0,
    expenses: Number(r.expenses) || 0,
    txn_count: Number(r.txn_count) || 0,
  }))
}

export interface AvailableMonth {
  month: string
  txn_count: number
}

export async function getAvailableMonths(
  supabase: SupabaseClient,
  userId: string,
  now: Date = new Date()
): Promise<AvailableMonth[]> {
  const current = currentMonthKey(now)
  const rows = await fetchMonthlySummary(supabase, userId, '1970-01-01', `${shiftMonth(current, 1)}-01`)
  const months: AvailableMonth[] = rows
    .filter(r => r.month <= current)
    .map(r => ({ month: r.month, txn_count: r.txn_count }))
  if (!months.some(m => m.month === current)) months.push({ month: current, txn_count: 0 })
  months.sort((a, b) => (a.month < b.month ? 1 : -1))
  return months
}

export interface ComparisonKpi {
  current: number
  previous: number
  change: number
  pct: number | null
}

export interface ComparisonCategory {
  categoryId: string | null
  name: string
  icon: string | null
  color: string | null
  current: number
  previous: number
  change: number
  pct: number | null
}

export interface MonthComparison {
  previousMonth: string
  previousLabel: string
  income: ComparisonKpi
  expenses: ComparisonKpi
  savings: ComparisonKpi
  categories: ComparisonCategory[]
}

export async function getMonthComparison(
  supabase: SupabaseClient,
  userId: string,
  range: MonthRange,
  current: KpiTotals,
  currentCategories: CategorySlice[]
): Promise<MonthComparison | null> {
  const prevMonth = shiftMonth(range.month, -1)
  const prevRange = monthRange(prevMonth)
  if (!prevRange) return null

  const [prevRows, prevCatRes, catListRes] = await Promise.all([
    fetchMonthlySummary(supabase, userId, prevRange.startDate, prevRange.endDate),
    supabase.rpc('category_summary', {
      p_user: userId,
      p_start: prevRange.startDate,
      p_end: prevRange.endDate,
      p_tz: DEFAULT_TZ,
    }),
    supabase.from('categories').select('id, name, icon, color'),
  ])

  const prev = prevRows.find(r => r.month === prevMonth)
  if (!prev || prev.txn_count === 0) return null
  if (prevCatRes.error && !isMissingRpc(prevCatRes.error)) throw new Error(prevCatRes.error.message)

  const prevById = new Map<string, number>()
  let prevUncategorised = 0
  for (const r of (prevCatRes.data || []) as CategorySummaryRow[]) {
    const spent = Math.round((Number(r.spent) || 0) * 100) / 100
    if (r.category_id) prevById.set(r.category_id, spent)
    else prevUncategorised += spent
  }

  const catMeta = new Map(
    (catListRes.data || []).map(c => [c.id, c] as [string, { name?: string; icon?: string | null; color?: string | null }])
  )

  const round = (n: number) => Math.round(n * 100) / 100
  const prevSavings = round(prev.income - prev.expenses)
  const kpi = (c: number, p: number): ComparisonKpi => ({
    current: c,
    previous: p,
    change: round(c - p),
    pct: p !== 0 ? Math.round(((c - p) / Math.abs(p)) * 100) : null,
  })

  const byId = new Map<string, ComparisonCategory>()
  for (const slice of currentCategories) {
    const key = slice.categoryId || UNCATEGORISED_KEY
    byId.set(key, {
      categoryId: slice.categoryId,
      name: slice.name,
      icon: slice.icon,
      color: slice.color,
      current: slice.value,
      previous: 0,
      change: slice.value,
      pct: null,
    })
  }
  const applyPrevious = (key: string, categoryId: string | null, name: string, icon: string | null, color: string | null, spent: number) => {
    const existing = byId.get(key)
    if (existing) {
      existing.previous = spent
      existing.change = round(existing.current - spent)
      existing.pct = spent !== 0 ? Math.round(((existing.current - spent) / spent) * 100) : null
    } else {
      byId.set(key, {
        categoryId,
        name,
        icon,
        color,
        current: 0,
        previous: spent,
        change: -spent,
        pct: spent !== 0 ? -100 : null,
      })
    }
  }
  for (const [id, spent] of prevById) {
    const meta = catMeta.get(id)
    applyPrevious(id, id, meta?.name || 'Deleted category', meta?.icon || null, meta?.color || null, spent)
  }
  if (prevUncategorised > 0) {
    applyPrevious(UNCATEGORISED_KEY, null, 'Uncategorised', '❔', '#64748B', prevUncategorised)
  }

  const categories = [...byId.values()]
    .filter(c => c.current !== 0 || c.previous !== 0)
    .sort((a, b) => b.change - a.change)

  return {
    previousMonth: prevMonth,
    previousLabel: prevRange.label,
    income: kpi(current.income, prev.income),
    expenses: kpi(current.expenses, prev.expenses),
    savings: kpi(current.net, prevSavings),
    categories,
  }
}

export interface DashboardBill {
  id: string
  name: string
  amount_estimate: number | null
  next_due_at: string
}

export interface DashboardMonthData {
  month: string
  label: string
  shortLabel: string
  isCurrentMonth: boolean
  partial: boolean
  days: number
  income: number
  expenses: number
  net: number
  savingsRate: number | null
  txnCount: number
  transactions: MonthTxnRow[]
  dailySeries: DailyPoint[]
  categories: CategorySlice[]
  budgets: BudgetWithSpend[]
  comparison: MonthComparison | null
  upcomingBills: DashboardBill[]
  monthlyBudget: number
  monthlyIncome: number
  subscriptionCount: number
  subscriptionMonthlyCost: number
  subscriptionsCharged: { count: number; total: number } | null
}

export async function getDashboardMonth(
  supabase: SupabaseClient,
  userId: string,
  month: string,
  now: Date = new Date()
): Promise<DashboardMonthData> {
  const range = monthRange(month)
  if (!range) throw new Error('Invalid month — expected YYYY-MM')
  const isCurrentMonth = month === currentMonthKey(now)

  const [txRes, profileRes] = await Promise.all([
    supabase
      .from('transactions')
      .select('id, date, amount, merchant, category_id, needs_review, categories(name, icon, color)')
      .eq('user_id', userId)
      .gte('date', range.startISO)
      .lt('date', range.endISO)
      .order('date', { ascending: false }),
    supabase
      .from('user_profiles')
      .select('monthly_budget, monthly_income')
      .eq('id', userId)
      .maybeSingle(),
  ])
  if (txRes.error) throw new Error(txRes.error.message)

  const transactions = (txRes.data || []) as MonthTxnRow[]
  const totals = summarize(transactions)
  const categories = buildCategoryBreakdown(transactions)
  const dailySeries = buildDailySeries(transactions, range)
  const savingsRate =
    totals.income > 0 ? Math.round(((totals.income - totals.expenses) / totals.income) * 1000) / 10 : null

  let partial = isCurrentMonth
  if (!partial && transactions.length > 0) {
    const days = transactions.map(t => monthDay(t.date))
    const first = Math.min(...days)
    const last = Math.max(...days)
    partial = first > 5 || last < range.days - 4
  }

  const budgets = await getBudgetsForPeriod(supabase, userId, range.startISO, range.endISO)

  let upcomingBills: DashboardBill[] = []
  let subscriptionCount = 0
  let subscriptionMonthlyCost = 0
  let subscriptionsCharged: { count: number; total: number } | null = null

  if (isCurrentMonth) {
    const [billsRes, subsRes] = await Promise.all([
      supabase
        .from('bills')
        .select('id, name, amount_estimate, next_due_at')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('next_due_at', { ascending: true })
        .limit(3),
      supabase
        .from('subscriptions')
        .select('avg_amount, cadence')
        .eq('user_id', userId)
        .in('status', ['active', 'candidate']),
    ])
    upcomingBills = (billsRes.data || []) as DashboardBill[]
    const subs = (subsRes.data || []) as { avg_amount: number | string; cadence: string }[]
    subscriptionCount = subs.length
    subscriptionMonthlyCost = subs.reduce((sum, s) => {
      const amt = Number(s.avg_amount) || 0
      switch (s.cadence) {
        case 'weekly': return sum + amt * 4.33
        case 'quarterly': return sum + amt / 3
        case 'annual': return sum + amt / 12
        default: return sum + amt
      }
    }, 0)
  } else {
    const subsRes = await supabase.from('subscriptions').select('merchant_normalized').eq('user_id', userId)
    const known = new Set(
      ((subsRes.data || []) as { merchant_normalized: string | null }[])
        .map(s => s.merchant_normalized || '')
        .filter(Boolean)
    )
    const seen = new Set<string>()
    let total = 0
    for (const tx of transactions) {
      const n = normalizeMerchant(tx.merchant || '')
      if (n && known.has(n)) {
        seen.add(n)
        total += Math.abs(tx.amount)
      }
    }
    subscriptionsCharged = { count: seen.size, total: Math.round(total * 100) / 100 }
  }

  const comparison = await getMonthComparison(supabase, userId, range, totals, categories)

  const profile = profileRes.data
  return {
    month,
    label: range.label,
    shortLabel: range.shortLabel,
    isCurrentMonth,
    partial,
    days: range.days,
    income: totals.income,
    expenses: totals.expenses,
    net: totals.net,
    savingsRate,
    txnCount: totals.count,
    transactions,
    dailySeries,
    categories,
    budgets,
    comparison,
    upcomingBills,
    monthlyBudget: Number(profile?.monthly_budget) || 50000,
    monthlyIncome: Number(profile?.monthly_income) || 0,
    subscriptionCount,
    subscriptionMonthlyCost: Math.round(subscriptionMonthlyCost * 100) / 100,
    subscriptionsCharged,
  }
}

export interface TrendMonth {
  month: string
  label: string
  income: number
  expenses: number
  net: number
  savingsRate: number | null
}

export interface TrendsData {
  months: TrendMonth[]
  categories: { key: string; name: string }[]
  series: { month: string; values: Record<string, number> }[]
}

export async function getTrends(
  supabase: SupabaseClient,
  userId: string,
  monthsCount = 6,
  now: Date = new Date()
): Promise<TrendsData> {
  const n = Math.min(12, Math.max(1, Math.round(monthsCount)))
  const current = currentMonthKey(now)
  const startMonth = shiftMonth(current, -(n - 1))
  const startRange = monthRange(startMonth)
  const endDate = `${shiftMonth(current, 1)}-01`
  if (!startRange) return { months: [], categories: [], series: [] }

  const [summary, catSummaryRes, catListRes] = await Promise.all([
    fetchMonthlySummary(supabase, userId, startRange.startDate, endDate),
    supabase.rpc('monthly_category_summary', {
      p_user: userId,
      p_start: startRange.startDate,
      p_end: endDate,
      p_tz: DEFAULT_TZ,
    }),
    supabase.from('categories').select('id, name'),
  ])

  if (catSummaryRes.error && !isMissingRpc(catSummaryRes.error)) throw new Error(catSummaryRes.error.message)

  const byMonth = new Map(summary.map(r => [r.month, r]))
  const months: TrendMonth[] = []
  const keys: string[] = []
  for (let i = 0; i < n; i++) {
    const key = shiftMonth(startMonth, i)
    const row = byMonth.get(key)
    const income = row?.income ?? 0
    const expenses = row?.expenses ?? 0
    months.push({
      month: key,
      label: monthLabel(key),
      income,
      expenses,
      net: Math.round((income - expenses) * 100) / 100,
      savingsRate: income > 0 ? Math.round(((income - expenses) / income) * 1000) / 10 : null,
    })
    keys.push(key)
  }

  const catName = new Map(
    (catListRes.data || []).map(c => [c.id as string, c.name as string])
  )
  catName.set(UNCATEGORISED_KEY, 'Uncategorised')

  const windowRows = ((catSummaryRes.data || []) as MonthlyCategoryRow[]).map(r => ({
    ...r,
    month: String(r.month).slice(0, 7),
    key: r.category_id || UNCATEGORISED_KEY,
    spent: Math.round((Number(r.spent) || 0) * 100) / 100,
  }))

  const totalsByKey = new Map<string, number>()
  for (const r of windowRows) totalsByKey.set(r.key, (totalsByKey.get(r.key) ?? 0) + r.spent)
  const topKeys = [...totalsByKey.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([k]) => k)
  const hasOther = [...totalsByKey.keys()].some(k => !topKeys.includes(k))
  const displayKeys = hasOther ? [...topKeys, 'other'] : topKeys

  const categories = displayKeys.map(key => ({
    key,
    name: key === 'other' ? 'Other' : catName.get(key) || 'Deleted category',
  }))

  const rowsByKey = new Map<string, Map<string, number>>()
  for (const r of windowRows) {
    const bucket = rowsByKey.get(r.month) ?? new Map<string, number>()
    bucket.set(r.key, (bucket.get(r.key) ?? 0) + r.spent)
    rowsByKey.set(r.month, bucket)
  }

  const series = keys.map(month => {
    const bucket = rowsByKey.get(month) ?? new Map<string, number>()
    const values: Record<string, number> = {}
    let other = 0
    for (const [key, spent] of bucket) {
      if (topKeys.includes(key)) values[key] = spent
      else other += spent
    }
    for (const key of topKeys) if (!(key in values)) values[key] = 0
    if (hasOther) values.other = Math.round(other * 100) / 100
    return { month, values }
  })

  return { months, categories, series }
}
