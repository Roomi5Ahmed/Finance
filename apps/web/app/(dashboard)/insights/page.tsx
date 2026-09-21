import { createClient } from '@/utils/supabase/server'
import CategoryInsightCard from '@/components/insights/CategoryInsightCard'

export default async function InsightsPage() {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const now = new Date()
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
  
  // Current month expenses
  const { data: txs } = await supabase
    .from('transactions')
    .select('amount, date, merchant, categories(name, icon, color)')
    .eq('user_id', user.id)
    .gte('date', firstDay.toISOString())
    .lt('amount', 0)
    .order('date', { ascending: false })

  // Previous month expenses (for MoM comparison)
  const lastMonthFirst = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthLast = new Date(now.getFullYear(), now.getMonth(), 0)
  const { data: lastMonthTxs } = await supabase
    .from('transactions')
    .select('amount, merchant, categories(name)')
    .eq('user_id', user.id)
    .gte('date', lastMonthFirst.toISOString())
    .lte('date', lastMonthLast.toISOString())
    .lt('amount', 0)

  const transactions = txs || []
  const lastMonthTransactions = lastMonthTxs || []

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('monthly_budget')
    .eq('id', user.id)
    .single()

  // ── Current month by category ────────────────────────────
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
    const catName = (tx.categories as any)?.name || 'Uncategorized'
    const icon = (tx.categories as any)?.icon || '❔'
    const color = (tx.categories as any)?.color || '#64748B'

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

  // ── Previous month totals per category ───────────────────
  const lastMonthByCategory: Record<string, number> = {}
  lastMonthTransactions.forEach((tx: any) => {
    const catName = (tx.categories as any)?.name || 'Uncategorized'
    lastMonthByCategory[catName] = (lastMonthByCategory[catName] || 0) + Math.abs(tx.amount)
  })

  // ── Assemble final sorted list ──────────────────────────
  const monthlyBudget = profile?.monthly_budget || 50000

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
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-white tracking-tight" style={{ fontFamily: 'var(--font-inter)' }}>AI Insights</h1>
        <p className="mt-1.5 text-sm text-[#8C8C8C]">
          Analyze your spending habits category by category and get personalized AI advice.
        </p>
      </div>

      {sortedCategories.length > 0 && (
        <div className="bg-[#181818] rounded-[0px] border border-white/5" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div className="w-10 h-10 rounded-[0px] bg-[#FF98A2]/10 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-[#FF98A2]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <div>
              <p className="text-xs text-[#8C8C8C]" style={{ fontFamily: 'var(--font-roboto)', marginBottom: '4px' }}>Total Expenses This Month</p>
              <p className="text-xl font-bold text-white">{'\u20B9'}{totalMonthlyExpenses.toLocaleString('en-IN')}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-[#8C8C8C]" style={{ fontFamily: 'var(--font-roboto)', marginBottom: '4px' }}>Active Categories</p>
            <p className="text-xl font-bold text-white">{sortedCategories.length}</p>
          </div>
        </div>
      )}

      {sortedCategories.length === 0 ? (
        <div className="bg-[#181818] rounded-[0px] border border-white/5 p-8 text-center">
          <p className="text-[#8C8C8C] text-sm">You have no expenses this month to analyze.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {sortedCategories.map((cat) => (
            <CategoryInsightCard 
              key={cat.name} 
              category={cat} 
              globalBudget={monthlyBudget} 
            />
          ))}
        </div>
      )}
    </div>
  )
}
