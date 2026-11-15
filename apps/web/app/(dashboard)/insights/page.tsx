import { createClient } from '@/utils/supabase/server'
import CategoryInsightCard from '@/components/insights/CategoryInsightCard'
import MonthSelector from '@/components/dashboard/MonthSelector'
import {
  currentMonthKey,
  getAvailableMonths,
  monthRange,
  shiftMonth,
} from '@/lib/api/dashboard'

interface ExpenseRow {
  amount: number
  date: string
  merchant: string
  categories: { name?: string | null; icon?: string | null; color?: string | null } | null
}

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { month: monthParam } = await searchParams
  const current = currentMonthKey()
  const month = monthParam && monthRange(monthParam) ? monthParam : current
  const isCurrentMonth = month === current
  const range = monthRange(month)
  if (!range) return null
  const prevRange = monthRange(shiftMonth(month, -1))

  const [availableMonths, txRes, prevTxRes, profileRes, cachedRes] = await Promise.all([
    getAvailableMonths(supabase, user.id),
    supabase
      .from('transactions')
      .select('amount, date, merchant, categories(name, icon, color)')
      .eq('user_id', user.id)
      .gte('date', range.startISO)
      .lt('date', range.endISO)
      .lt('amount', 0)
      .order('date', { ascending: false }),
    supabase
      .from('transactions')
      .select('amount, merchant, categories(name)')
      .eq('user_id', user.id)
      .gte('date', prevRange?.startISO ?? range.startISO)
      .lt('date', prevRange?.endISO ?? range.startISO)
      .lt('amount', 0),
    supabase
      .from('user_profiles')
      .select('monthly_budget')
      .eq('id', user.id)
      .maybeSingle(),
    // Past-month tips are immutable — preload anything already generated.
    isCurrentMonth
      ? Promise.resolve({ data: null as { category_name: string; tips: unknown }[] | null, error: null })
      : supabase
        .from('ai_tips_cache')
        .select('category_name, tips')
        .eq('user_id', user.id)
        .eq('month', month),
  ])

  const transactions = (txRes.data || []) as ExpenseRow[]
  const lastMonthTransactions = (prevTxRes.data || []) as Pick<ExpenseRow, 'amount' | 'merchant' | 'categories'>[]
  const monthlyBudget = Number(profileRes.data?.monthly_budget) || 50000

  const cachedTips = new Map<string, string[]>()
  if (cachedRes?.data && !cachedRes.error) {
    for (const row of cachedRes.data) {
      if (Array.isArray(row.tips) && row.tips.length > 0) {
        cachedTips.set(row.category_name, row.tips as string[])
      }
    }
  }

  // ── Selected month by category ──────────────────────────
  const categoryData: Record<string, {
    name: string
    icon: string
    color: string
    totalSpent: number
    merchantSpend: Record<string, number>
    merchants: string[]
    history: { date: string; amount: number }[]
    transactionCount: number
  }> = {}

  let totalMonthlyExpenses = 0

  transactions.forEach((tx) => {
    const amount = Math.abs(tx.amount)
    totalMonthlyExpenses += amount
    const catName = tx.categories?.name || 'Uncategorized'
    const icon = tx.categories?.icon || '❔'
    const color = tx.categories?.color || '#64748B'

    if (!categoryData[catName]) {
      categoryData[catName] = {
        name: catName, icon, color, totalSpent: 0,
        merchantSpend: {}, merchants: [], history: [],
        transactionCount: 0,
      }
    }

    categoryData[catName].totalSpent += amount
    categoryData[catName].transactionCount += 1
    categoryData[catName].merchantSpend[tx.merchant] =
      (categoryData[catName].merchantSpend[tx.merchant] || 0) + amount

    const dateStr = new Date(tx.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
    const existingDate = categoryData[catName].history.find(h => h.date === dateStr)
    if (existingDate) {
      existingDate.amount += amount
    } else {
      categoryData[catName].history.push({ date: dateStr, amount })
    }
  })

  // ── Previous month totals per category ─────────────────
  const lastMonthByCategory: Record<string, number> = {}
  lastMonthTransactions.forEach((tx) => {
    const catName = tx.categories?.name || 'Uncategorized'
    lastMonthByCategory[catName] = (lastMonthByCategory[catName] || 0) + Math.abs(tx.amount)
  })

  // ── Assemble final sorted list ──────────────────────────
  const sortedCategories = Object.values(categoryData)
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .map(c => {
      // Sort merchants by spend descending
      const sortedMerchants = Object.entries(c.merchantSpend)
        .sort(([, a], [, b]) => b - a)
        .map(([name, spend]) => ({ name, spend }))

      const lastMonthSpent = lastMonthByCategory[c.name] || 0
      const momChange = lastMonthSpent > 0
        ? Math.round(((c.totalSpent - lastMonthSpent) / lastMonthSpent) * 100)
        : null // null = no previous data (new category)

      return {
        ...c,
        merchants: sortedMerchants.map(m => m.name),
        merchantSpend: sortedMerchants,
        momChange,
        lastMonthSpent,
        avgTransactionSize: c.transactionCount > 0 ? Math.round(c.totalSpent / c.transactionCount) : 0,
        budgetPercentage: Math.min(100, Math.round((c.totalSpent / monthlyBudget) * 100)),
        history: c.history.reverse(),
      }
    })

  return (
    <div className="animate-in text-[#01472e]" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-[#fefae0] tracking-tight" style={{ fontFamily: 'var(--font-inter)' }}>AI Insights</h1>
        <p className="mt-1.5 text-sm text-[#ccd5ae]">
          Analyze your spending habits category by category and get personalized AI advice.
        </p>
        <div className="mt-4 flex items-center gap-3 flex-wrap">
          <MonthSelector
            month={month}
            months={availableMonths}
            isCurrentMonth={isCurrentMonth}
            pathname="/insights"
          />
          {!isCurrentMonth && (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-[rgba(254,250,224,0.08)] text-[#ccd5ae] border border-[rgba(254,250,224,0.2)]">
              Viewing past month — read only
            </span>
          )}
        </div>
      </div>

      {sortedCategories.length > 0 && (
        <div className="bg-[#ffffff] rounded-[0px] border border-[#dde3d0]" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div className="w-10 h-10 rounded-[0px] bg-[#01472e]/10 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-[#01472e]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <div>
              <p className="text-xs text-[#64705f]" style={{ fontFamily: 'var(--font-roboto)', marginBottom: '4px' }}>Total Expenses — {range.label}</p>
              <p className="text-xl font-bold text-[#01472e]">{'\u20B9'}{totalMonthlyExpenses.toLocaleString('en-IN')}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-[#64705f]" style={{ fontFamily: 'var(--font-roboto)', marginBottom: '4px' }}>Active Categories</p>
            <p className="text-xl font-bold text-[#01472e]">{sortedCategories.length}</p>
          </div>
        </div>
      )}

      {sortedCategories.length === 0 ? (
        <div className="bg-[#ffffff] rounded-[0px] border border-[#dde3d0] p-8 text-center">
          <p className="text-[#64705f] text-sm">You have no expenses in {range.label} to analyze.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {sortedCategories.map((cat) => (
            <CategoryInsightCard
              key={cat.name}
              category={cat}
              globalBudget={monthlyBudget}
              month={month}
              monthLabel={range.label}
              cachedTips={cachedTips.get(cat.name) ?? null}
            />
          ))}
        </div>
      )}
    </div>
  )
}
