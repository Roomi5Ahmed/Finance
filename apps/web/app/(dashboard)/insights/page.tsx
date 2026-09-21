import { createClient } from '@/utils/supabase/server'
import CategoryInsightCard from '@/components/insights/CategoryInsightCard'

export default async function InsightsPage() {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  // Fetch all transactions for the current month
  const now = new Date()
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
  
  const { data: txs } = await supabase
    .from('transactions')
    .select('amount, date, merchant, categories(name, icon, color)')
    .eq('user_id', user.id)
    .gte('date', firstDay.toISOString())
    .lt('amount', 0) // Only look at expenses
    .order('date', { ascending: false })

  const transactions = txs || []

  // Fetch budget from user_profiles
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('monthly_budget')
    .eq('id', user.id)
    .single()

  // Group by Category
  const categoryData: Record<string, {
    name: string
    icon: string
    color: string
    totalSpent: number
    merchants: Set<string>
    history: { date: string; amount: number }[]
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
        name: catName,
        icon,
        color,
        totalSpent: 0,
        merchants: new Set(),
        history: []
      }
    }

    categoryData[catName].totalSpent += amount
    categoryData[catName].merchants.add(tx.merchant)
    
    // Group history by date for the chart
    const dateStr = new Date(tx.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
    const existingDate = categoryData[catName].history.find(h => h.date === dateStr)
    if (existingDate) {
      existingDate.amount += amount
    } else {
      categoryData[catName].history.push({ date: dateStr, amount })
    }
  })

  // Sort categories by total spent descending
  const sortedCategories = Object.values(categoryData)
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .map(c => ({
      ...c,
      merchants: Array.from(c.merchants),
      history: c.history.reverse() // Chronological order
    }))

  const monthlyBudget = profile?.monthly_budget || 50000 // From user_profiles

  return (
    <div className="space-y-6 animate-in">
      {/* Page Header */}
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-white tracking-tight" style={{ fontFamily: 'var(--font-inter)' }}>AI Insights</h1>
        <p className="mt-1.5 text-sm text-[#8C8C8C]">
          Analyze your spending habits category by category and get personalized AI advice.
        </p>
      </div>

      {/* Summary Banner */}
      {sortedCategories.length > 0 && (
        <div className="bg-[#181818] rounded-[0px] border border-white/5 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-[0px] bg-[#FF98A2]/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-[#FF98A2]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <div>
              <p className="text-xs text-[#8C8C8C]" style={{ fontFamily: 'var(--font-roboto)' }}>Total Expenses This Month</p>
              <p className="text-lg font-bold text-white">&#8377;{totalMonthlyExpenses.toLocaleString('en-IN')}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-[#8C8C8C]" style={{ fontFamily: 'var(--font-roboto)' }}>Active Categories</p>
            <p className="text-lg font-bold text-white">{sortedCategories.length}</p>
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
