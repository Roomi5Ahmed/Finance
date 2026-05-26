"use client"

import { Card, CardContent } from "@/components/ui/card"
import { GlowCard } from "@/components/ui/spotlight-card"
import { TrendingUp, TrendingDown, Wallet, PieChart, ArrowUpRight, Sparkles } from "lucide-react"
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, AreaChart, Area
} from 'recharts'
import Link from 'next/link'

export default function DashboardContent({ transactions, userEmail, monthlyBudget, monthlyIncome }: { transactions: any[], userEmail: string, monthlyBudget: number, monthlyIncome: number }) {
  // ─── Data Processing ───────────────────────────────────────────────
  const totalBalance = transactions.reduce((sum: number, tx: any) => sum + tx.amount, 0)

  const now = new Date()
  const thisMonthTxs = transactions.filter((tx: any) => {
    const d = new Date(tx.date)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })

  const thisMonthExpenses = Math.abs(
    thisMonthTxs.filter((tx: any) => tx.amount < 0).reduce((sum: number, tx: any) => sum + tx.amount, 0)
  )
  const thisMonthIncome = thisMonthTxs
    .filter((tx: any) => tx.amount > 0)
    .reduce((sum: number, tx: any) => sum + tx.amount, 0)

  // Using monthlyBudget from props
  const budgetPercentage = Math.min(100, Math.round((thisMonthExpenses / monthlyBudget) * 100))
  const strokeDasharray = `${budgetPercentage}, 100`

  const recentTxs = transactions.slice(0, 6)

  // Line chart data
  const last7Days = new Map()
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    last7Days.set(d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }), 0)
  }
  transactions.forEach((tx: any) => {
    if (tx.amount >= 0) return
    const dateStr = new Date(tx.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
    if (last7Days.has(dateStr)) last7Days.set(dateStr, last7Days.get(dateStr) + Math.abs(tx.amount))
  })
  const lineChartData = Array.from(last7Days, ([name, value]) => ({ name, value }))

  // Category breakdown
  const categoryTotals = new Map<string, number>()
  transactions.forEach((tx: any) => {
    if (tx.amount >= 0) return
    const cat = tx.categories?.name || 'Uncategorised'
    categoryTotals.set(cat, (categoryTotals.get(cat) || 0) + Math.abs(tx.amount))
  })
  const barChartData = Array.from(categoryTotals, ([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value).slice(0, 5)
  const COLORS = ['#818cf8', '#34d399', '#f472b6', '#fbbf24', '#38bdf8']

  // ─── Feature Cards Data ────────────────────────────────────────────
  const featureCards = [
    {
      title: "Total Balance",
      value: `₹${totalBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      subtitle: "Calculated from all transactions",
      icon: Wallet,
      color: "text-yellow-400",
      bgColor: "bg-yellow-500/10",
      trend: totalBalance >= 0 ? "positive" : "negative"
    },
    {
      title: "Monthly Budget",
      value: `${budgetPercentage}%`,
      subtitle: `₹${thisMonthExpenses.toLocaleString('en-IN')} / ₹${monthlyBudget.toLocaleString('en-IN')}`,
      icon: PieChart,
      color: budgetPercentage > 80 ? "text-red-400" : "text-emerald-400",
      bgColor: budgetPercentage > 80 ? "bg-red-500/10" : "bg-emerald-500/10",
      trend: budgetPercentage > 80 ? "negative" : "positive"
    },
    {
      title: "Income This Month",
      value: `₹${thisMonthIncome.toLocaleString('en-IN')}`,
      subtitle: "Credits received this month",
      icon: TrendingUp,
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/10",
      trend: "positive"
    },
    {
      title: "Expenses This Month",
      value: `₹${thisMonthExpenses.toLocaleString('en-IN')}`,
      subtitle: "Total debits this month",
      icon: TrendingDown,
      color: "text-pink-400",
      bgColor: "bg-pink-500/10",
      trend: "negative"
    },
  ]

  return (
    <div className="w-full text-white animate-in flex gap-3 min-h-[calc(100vh-4rem)]">
      
      {/* ─── LEFT PANEL (20%) — Header ─────────────────────────────── */}
      <GlowCard glowColor="purple" className="hidden lg:flex w-[20%] shrink-0 flex-col justify-between p-5">
        <div className="flex flex-col gap-[5px]">
          <h1 className="text-2xl font-semibold tracking-tight leading-tight">
            Your financial{' '}
            <span className="text-indigo-400">overview at a glance.</span>
          </h1>
          <p className="text-xs text-slate-400">Welcome back, {userEmail}</p>
        </div>
        
        {/* Budget Ring at bottom of sidebar */}
        <div className="flex flex-col items-center gap-3 mt-auto">
          <div className="relative w-20 h-20 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path className="text-slate-800" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              <path className={`${budgetPercentage > 90 ? 'text-red-500' : 'text-emerald-400'}`} strokeWidth="3" strokeDasharray={strokeDasharray} strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
            </svg>
            <span className="absolute text-lg font-bold text-white">{budgetPercentage}%</span>
          </div>
          <div className="text-center">
            <p className="text-xs font-medium text-white">Budget Used</p>
            <p className="text-[10px] text-slate-500 mt-0.5">₹{thisMonthExpenses.toLocaleString('en-IN')} / ₹{monthlyBudget.toLocaleString('en-IN')}</p>
          </div>
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium ${budgetPercentage > 80 ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
            {budgetPercentage > 80 ? 'Over Budget' : 'On Track'}
          </span>
        </div>
      </GlowCard>

      {/* ─── RIGHT PANEL (80%) — All Dashboard Panels ──────────────── */}
      <div className="flex-1 min-w-0 flex flex-col gap-3">
        
        {/* Mobile-only header (hidden on lg+) */}
        <div className="lg:hidden bg-[#151D2C] rounded-xl border border-white/5 p-4">
          <h1 className="text-xl font-semibold tracking-tight">
            Your financial <span className="text-indigo-400">overview at a glance.</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">Welcome back, {userEmail}</p>
        </div>

        {/* Row 1: Spending Chart + 4 KPIs */}
        <div className="flex gap-3 flex-col lg:flex-row">
          {/* Main Chart Card */}
          <GlowCard glowColor="blue" className="lg:flex-[2] flex flex-col min-h-[320px]">
            <CardContent className="p-3 flex-grow flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs text-slate-400 font-medium tracking-wide">Spending Trend (Last 7 Days)</h3>
                <span className="text-[10px] text-slate-500">
                  {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                </span>
              </div>
              <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={lineChartData} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
                    <defs>
                      <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff06" vertical={false} />
                    <XAxis dataKey="name" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748b" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} width={50} />
                    <Tooltip contentStyle={{ backgroundColor: '#0B1121', border: '1px solid #ffffff10', borderRadius: '10px', color: '#fff', fontSize: '11px' }} formatter={(value: any) => [`₹${value.toLocaleString()}`, 'Spent']} />
                    <Area type="monotone" dataKey="value" stroke="#818cf8" strokeWidth={2} fillOpacity={1} fill="url(#spendGradient)" dot={{ fill: '#818cf8', r: 2.5 }} activeDot={{ r: 4, fill: '#fff', stroke: '#818cf8', strokeWidth: 2 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </GlowCard>

          {/* KPI Feature Cards (2×2) */}
          <div className="lg:flex-1 grid grid-cols-2 gap-3">
            {featureCards.map((feature, i) => {
              const Icon = feature.icon
              return (
                <GlowCard
                  key={i}
                  glowColor="purple"
                  className="flex flex-col p-3 cursor-pointer transition-all group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className={`p-1.5 rounded-lg ${feature.bgColor}`}>
                      <Icon className={`w-3.5 h-3.5 ${feature.color}`} />
                    </div>
                    {feature.trend === "positive" ? (
                      <TrendingUp className="w-3 h-3 text-emerald-400 opacity-40 group-hover:opacity-100 transition-opacity" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-red-400 opacity-40 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>
                  <p className="text-lg font-bold text-white mb-0.5 tracking-tight">{feature.value}</p>
                  <h3 className="text-[11px] font-medium text-slate-300">{feature.title}</h3>
                  <p className="text-[9px] text-slate-500 leading-relaxed mt-0.5">{feature.subtitle}</p>
                </GlowCard>
              )
            })}
          </div>
        </div>

        {/* Row 2: Recent Transactions + Category Breakdown */}
        <div className="flex gap-3 flex-col md:flex-row">
          {/* Recent Transactions */}
          <GlowCard glowColor="green" className="flex-1">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs text-slate-400 font-medium tracking-wide">Recent Transactions</h3>
                <Link href="/transactions" className="text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors flex items-center">
                  View all <ArrowUpRight className="w-2.5 h-2.5 ml-0.5" />
                </Link>
              </div>
              <div className="space-y-2">
                {recentTxs.length === 0 ? (
                  <p className="text-slate-500 text-xs text-center py-4">No transactions yet.</p>
                ) : recentTxs.map((tx: any) => (
                  <div key={tx.id} className="flex items-center justify-between group hover:bg-white/[0.02] -mx-1.5 px-1.5 py-1 rounded-lg transition-colors">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-7 h-7 rounded-md bg-[#0B1121] flex items-center justify-center text-sm border border-white/5 shrink-0">
                        {(tx.categories as any)?.icon || '🛒'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-medium text-white truncate max-w-[120px] group-hover:text-indigo-400 transition-colors">{tx.merchant}</p>
                        <p className="text-[9px] text-slate-500">{new Date(tx.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</p>
                      </div>
                    </div>
                    <span className={`text-[11px] font-semibold ${tx.amount < 0 ? 'text-white' : 'text-emerald-400'}`}>
                      {tx.amount < 0 ? '-' : '+'}₹{Math.abs(tx.amount).toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </GlowCard>

          {/* Top Categories */}
          <GlowCard glowColor="orange" className="flex-1">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs text-slate-400 font-medium tracking-wide">Top Categories</h3>
                <Link href="/insights" className="text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors flex items-center">
                  <Sparkles className="w-2.5 h-2.5 mr-0.5" /> AI Insights <ArrowUpRight className="w-2.5 h-2.5 ml-0.5" />
                </Link>
              </div>
              <div className="w-full h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barChartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff06" horizontal={false} />
                    <XAxis type="number" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 9 }} tickLine={false} axisLine={false} />
                    <YAxis dataKey="name" type="category" stroke="#64748b" tick={{ fill: '#cbd5e1', fontSize: 10 }} tickLine={false} axisLine={false} width={80} />
                    <Tooltip cursor={{ fill: '#ffffff05' }} contentStyle={{ backgroundColor: '#0B1121', border: '1px solid #ffffff10', borderRadius: '10px', color: '#fff', fontSize: '11px' }} formatter={(value: any) => [`₹${value.toLocaleString()}`, 'Amount']} />
                    <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                      {barChartData.map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </GlowCard>
        </div>

      </div>
    </div>
  )
}
