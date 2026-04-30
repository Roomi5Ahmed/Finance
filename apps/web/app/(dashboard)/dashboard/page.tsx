import { createClient } from '@/utils/supabase/server'
import AnalyticsCharts from '@/components/dashboard/AnalyticsCharts'
import AIInsightsWidget from '@/components/dashboard/AIInsightsWidget'

export default async function DashboardPage() {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  // Fetch all transactions
  const { data: txs } = await supabase
    .from('transactions')
    .select('id, amount, date, merchant, categories(name, icon, color)')
    .eq('user_id', user.id)
    .order('date', { ascending: false })

  const transactions = txs || []

  // 1. Total Balance
  const totalBalance = transactions.reduce((sum, tx) => sum + tx.amount, 0)

  // 2. Monthly Budget (Expenses this month)
  const now = new Date()
  const thisMonthTxs = transactions.filter(tx => {
    const d = new Date(tx.date)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })

  const thisMonthExpenses = Math.abs(thisMonthTxs
    .filter(tx => tx.amount < 0)
    .reduce((sum, tx) => sum + tx.amount, 0))

  const monthlyBudget = 50000 // Hardcoded for MVP, ideally from user_profiles
  const budgetPercentage = Math.min(100, Math.round((thisMonthExpenses / monthlyBudget) * 100))
  const strokeDasharray = `${budgetPercentage}, 100`

  // 3. Recent Activity
  const recentTxs = transactions.slice(0, 5)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Dashboard</h1>
        <p className="mt-2 text-slate-400">
          Welcome back, {user?.email}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Total Balance Card */}
        <div className="relative overflow-hidden bg-[#151D2C] rounded-2xl border border-white/5 shadow-xl p-6 flex flex-col h-72">
          <div className="flex items-start justify-between relative z-10">
            <h3 className="text-slate-400 font-medium tracking-wide">Total Balance</h3>
            <span className="text-yellow-500 bg-yellow-500/10 p-2 rounded-full">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
          </div>
          
          <div className="mt-4 relative z-10">
            <p className="text-4xl font-bold text-white tracking-tight">₹{totalBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
          </div>

          <div className="mt-auto relative z-10">
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-400">
              <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
              Calculated from all transactions
            </span>
          </div>

          {/* Decorative Wave Gradient */}
          <div className="absolute bottom-0 left-0 right-0 h-32 opacity-50 pointer-events-none">
            <svg viewBox="0 0 400 150" preserveAspectRatio="none" className="w-full h-full">
              <path d="M0,150 C100,50 150,120 250,80 C350,40 400,100 400,100 L400,150 L0,150 Z" fill="url(#gradient)" />
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#818cf8" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#818cf8" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M0,150 C100,50 150,120 250,80 C350,40 400,100 400,100" fill="none" stroke="#818cf8" strokeWidth="2" strokeOpacity="0.5" />
            </svg>
          </div>
        </div>

        {/* Monthly Budget Card */}
        <div className="bg-[#151D2C] rounded-2xl border border-white/5 shadow-xl p-6 flex flex-col h-72">
          <div className="flex items-start justify-between">
            <h3 className="text-slate-400 font-medium tracking-wide">Monthly Budget</h3>
            <span className="text-pink-500 bg-pink-500/10 p-2 rounded-full">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </span>
          </div>
          
          <div className="flex-1 flex flex-col items-center justify-center mt-2">
            <div className="relative w-32 h-32 flex items-center justify-center">
              {/* SVG Donut Chart */}
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-800"
                  strokeWidth="4"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className={`${budgetPercentage > 90 ? 'text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]'}`}
                  strokeWidth="4"
                  strokeDasharray={strokeDasharray}
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-3xl font-bold text-white">{budgetPercentage}%</span>
                <span className="text-xs text-slate-400">Spent</span>
              </div>
            </div>
            
            <p className="mt-4 text-sm text-white font-medium">
              ₹{thisMonthExpenses.toLocaleString('en-IN')} <span className="text-slate-500 font-normal">/ ₹{monthlyBudget.toLocaleString('en-IN')} Used</span>
            </p>
          </div>
        </div>

        {/* Recent Activity Card */}
        <div className="bg-[#151D2C] rounded-2xl border border-white/5 shadow-xl p-6 flex flex-col h-72">
          <h3 className="text-slate-400 font-medium tracking-wide mb-4">Recent Activity</h3>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
            {recentTxs.length === 0 ? (
              <p className="text-slate-500 text-sm mt-4 text-center">No recent activity found.</p>
            ) : recentTxs.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between group">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-xl shadow-sm border border-white/5">
                    {(tx.categories as any)?.icon || '🛒'}
                  </div>
                  <div>
                    <p className="text-white font-medium text-sm group-hover:text-indigo-400 transition-colors truncate max-w-[120px]">
                      {tx.merchant}
                    </p>
                    <p className="text-slate-500 text-xs mt-0.5">
                      {new Date(tx.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                <span className={`font-medium text-sm ${tx.amount < 0 ? 'text-white' : 'text-emerald-400'}`}>
                  {tx.amount < 0 ? '-' : '+'}₹{Math.abs(tx.amount).toLocaleString('en-IN')}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

      <AnalyticsCharts transactions={transactions} />
      
      <AIInsightsWidget />
    </div>
  )
}
