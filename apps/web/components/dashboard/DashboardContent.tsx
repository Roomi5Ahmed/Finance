"use client"

import { Card, CardContent } from "@/components/ui/card"
import { GlowCard } from "@/components/ui/spotlight-card"
import { TrendingUp, TrendingDown, Wallet, PieChart, ArrowUpRight, Sparkles, CreditCard, Receipt } from "lucide-react"
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import Link from 'next/link'

export default function DashboardContent({
  transactions,
  userEmail,
  monthlyBudget,
  monthlyIncome,
  budgets = [],
  upcomingBills = [],
  subscriptionCount = 0,
  subscriptionMonthlyCost = 0,
}: {
  transactions: any[]
  userEmail: string
  monthlyBudget: number
  monthlyIncome: number
  budgets?: any[]
  upcomingBills?: any[]
  subscriptionCount?: number
  subscriptionMonthlyCost?: number
}) {
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

  const budgetPercentage = Math.min(100, Math.round((thisMonthExpenses / monthlyBudget) * 100))
  const strokeDasharray = `${budgetPercentage}, 100`

  const recentTxs = transactions.slice(0, 6)

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

  const categoryTotals = new Map<string, number>()
  transactions.forEach((tx: any) => {
    if (tx.amount >= 0) return
    const cat = tx.categories?.name || 'Uncategorised'
    categoryTotals.set(cat, (categoryTotals.get(cat) || 0) + Math.abs(tx.amount))
  })
  const barChartData = Array.from(categoryTotals, ([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value).slice(0, 5)
  const COLORS = ['#01472e', '#64705f', '#a3b18a', '#ccd5ae', '#e9edc9']

  const featureCards = [
    {
      title: "Total Balance",
      value: `₹${totalBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      subtitle: "Calculated from all transactions",
      icon: Wallet,
      color: "text-[#01472e]",
      trend: totalBalance >= 0 ? "positive" : "negative"
    },
    {
      title: "Monthly Budget",
      value: `${budgetPercentage}%`,
      subtitle: `₹${thisMonthExpenses.toLocaleString('en-IN')} / ₹${monthlyBudget.toLocaleString('en-IN')}`,
      icon: PieChart,
      color: budgetPercentage > 80 ? "text-[#01472e]" : "text-[#64705f]",
      trend: budgetPercentage > 80 ? "negative" : "positive"
    },
    {
      title: "Income This Month",
      value: `₹${thisMonthIncome.toLocaleString('en-IN')}`,
      subtitle: "Credits received this month",
      icon: TrendingUp,
      color: "text-[#01472e]",
      trend: "positive"
    },
    {
      title: "Expenses This Month",
      value: `₹${thisMonthExpenses.toLocaleString('en-IN')}`,
      subtitle: "Total debits this month",
      icon: TrendingDown,
      color: "text-[#01472e]",
      trend: "negative"
    },
  ]

  return (
    <div className="w-full text-[#01472e] animate-in flex gap-8">

      {/* ─── LEFT PANEL — Hero ─────────────────────────────── */}
      <GlowCard glowColor="purple" className="hidden lg:flex w-[280px] shrink-0 flex-col p-6">
        <div className="flex flex-col gap-2">
          <h1 className="font-bold tracking-tight leading-[0.9] text-[#01472e]" style={{ fontFamily: 'var(--font-inter), Inter, sans-serif', fontSize: 'clamp(28px, 3vw, 42px)' }}>
            Your financial{' '}
            <span className="text-[#64705f]">overview.</span>
          </h1>
          <p className="text-xs text-[#64705f] mt-1" style={{ fontFamily: 'var(--font-roboto), Roboto, sans-serif', fontWeight: 900 }}>
            Welcome back, {userEmail}
          </p>
        </div>

        {/* Budget Ring — centered in the hero panel */}
        <div className="flex flex-col items-center gap-4" style={{ marginTop: '100px' }}>
          <div className="relative w-24 h-24 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path className="text-[#dde3d0]" strokeWidth="2.5" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              <path className={`${budgetPercentage > 90 ? 'text-[#01472e]' : 'text-[#a3b18a]'}`} strokeWidth="2.5" strokeDasharray={strokeDasharray} strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
            </svg>
            <span className="absolute text-xl font-bold text-[#01472e]">{budgetPercentage}%</span>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-[#01472e]">Budget Used</p>
            <p className="text-xs text-[#64705f] mt-1">₹{thisMonthExpenses.toLocaleString('en-IN')} / ₹{monthlyBudget.toLocaleString('en-IN')}</p>
          </div>
          <span className={`px-3 py-1 rounded-[4px] text-xs font-medium ${budgetPercentage > 80 ? 'bg-[#01472e]/10 text-[#01472e]' : 'bg-[#f6f8f1] text-[#01472e]'}`}>
            {budgetPercentage > 80 ? 'Over Budget' : 'On Track'}
          </span>
        </div>
      </GlowCard>

      {/* ─── RIGHT PANEL — Dashboard Panels ──────────────── */}
      <div className="flex-1 min-w-0 flex flex-col gap-8">

        {/* Mobile-only header */}
        <div className="lg:hidden p-4">
          <h1 className="font-bold tracking-tight text-[#fefae0]" style={{ fontFamily: 'var(--font-inter), Inter, sans-serif', fontSize: 'clamp(24px, 4vw, 36px)', lineHeight: 0.9 }}>
            Your financial <span className="text-[#ccd5ae]">overview.</span>
          </h1>
          <p className="text-xs text-[#a3b18a] mt-2" style={{ fontFamily: 'var(--font-roboto), Roboto, sans-serif', fontWeight: 900 }}>
            Welcome back, {userEmail}
          </p>
        </div>

        {/* Row 1: Spending Chart + 4 KPIs */}
        <div className="flex gap-6 flex-col lg:flex-row">
          <GlowCard glowColor="purple" className="lg:flex-[2] flex flex-col min-h-[340px]">
            <CardContent className="p-6 flex-grow flex flex-col">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-xs text-[#64705f] font-semibold tracking-wider uppercase" style={{ fontFamily: 'var(--font-roboto), Roboto, sans-serif' }}>
                  Spending Trend
                </h3>
                <span className="text-[10px] text-[#64705f]">
                  {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                </span>
              </div>
              <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={lineChartData} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
                    <defs>
                      <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#01472e" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#01472e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(1,71,46,0.05)" vertical={false} />
                    <XAxis dataKey="name" stroke="#64705f" tick={{ fill: '#64705f', fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64705f" tick={{ fill: '#64705f', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} width={50} />
                    <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid rgba(1,71,46,0.12)', borderRadius: '11px', color: '#01472e', fontSize: '11px' }} formatter={(value: any) => [`₹${value.toLocaleString()}`, 'Spent']} />
                    <Area type="monotone" dataKey="value" stroke="#01472e" strokeWidth={1.5} fillOpacity={1} fill="url(#spendGradient)" dot={{ fill: '#01472e', r: 2 }} activeDot={{ r: 4, fill: '#01472e', stroke: '#01472e', strokeWidth: 2 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </GlowCard>

          <div className="lg:flex-1 grid grid-cols-2 gap-4">
            {featureCards.map((feature, i) => {
              const Icon = feature.icon
              return (
                <GlowCard
                  key={i}
                  glowColor="purple"
                  className="flex flex-col p-6 cursor-pointer transition-all duration-[0.6s] ease-[cubic-bezier(0.19,1,0.22,1)] group"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2 bg-[#f6f8f1]">
                      <Icon className={`w-4 h-4 ${feature.color}`} />
                    </div>
                    {feature.trend === "positive" ? (
                      <TrendingUp className="w-3 h-3 text-[#01472e] opacity-30 group-hover:opacity-100 transition-opacity duration-[0.6s]" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-[#01472e] opacity-30 group-hover:opacity-100 transition-opacity duration-[0.6s]" />
                    )}
                  </div>
                  <p className="text-lg font-bold text-[#01472e] mb-0.5 tracking-tight">{feature.value}</p>
                  <h3 className="text-[11px] font-medium text-[#64705f]">{feature.title}</h3>
                  <p className="text-[9px] text-[#64705f]/60 leading-relaxed mt-0.5">{feature.subtitle}</p>
                </GlowCard>
              )
            })}
          </div>
        </div>

        {/* Row 2: Recent Transactions + Category Breakdown */}
        <div className="flex gap-6 flex-col md:flex-row">
          <GlowCard glowColor="purple" className="flex-1">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-xs text-[#64705f] font-semibold tracking-wider uppercase" style={{ fontFamily: 'var(--font-roboto), Roboto, sans-serif' }}>
                  Recent Transactions
                </h3>
                <Link href="/transactions" className="text-[10px] text-[#01472e] hover:text-[#01472e]/80 transition-colors duration-[0.6s] flex items-center">
                  View all <ArrowUpRight className="w-2.5 h-2.5 ml-0.5" />
                </Link>
              </div>
              <div className="space-y-1">
                {recentTxs.length === 0 ? (
                  <p className="text-[#64705f] text-xs text-center py-6">No transactions yet.</p>
                ) : recentTxs.map((tx: any) => (
                  <div key={tx.id} className="flex items-center justify-between group hover:bg-[#f6f8f1] -mx-2 px-2 py-2 transition-all duration-[0.6s] ease-[cubic-bezier(0.19,1,0.22,1)]">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-[#ffffff] flex items-center justify-center text-sm border border-[#dde3d0] shrink-0">
                        {(tx.categories as any)?.icon || '🛒'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-medium text-[#01472e] truncate max-w-[120px] group-hover:text-[#01472e] transition-colors duration-[0.6s]">{tx.merchant}</p>
                        <p className="text-[9px] text-[#64705f]">{new Date(tx.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</p>
                      </div>
                    </div>
                    <span className={`text-[11px] font-semibold ${tx.amount < 0 ? 'text-[#01472e]' : 'text-[#01472e]'}`}>
                      {tx.amount < 0 ? '-' : '+'}₹{Math.abs(tx.amount).toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </GlowCard>

          <GlowCard glowColor="purple" className="flex-1">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-xs text-[#64705f] font-semibold tracking-wider uppercase" style={{ fontFamily: 'var(--font-roboto), Roboto, sans-serif' }}>
                  Top Categories
                </h3>
                <Link href="/insights" className="text-[10px] text-[#01472e] hover:text-[#01472e]/80 transition-colors duration-[0.6s] flex items-center">
                  <Sparkles className="w-2.5 h-2.5 mr-0.5" /> AI Insights <ArrowUpRight className="w-2.5 h-2.5 ml-0.5" />
                </Link>
              </div>
              <div className="w-full h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barChartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(1,71,46,0.05)" horizontal={false} />
                    <XAxis type="number" stroke="#64705f" tick={{ fill: '#64705f', fontSize: 9 }} tickLine={false} axisLine={false} />
                    <YAxis dataKey="name" type="category" stroke="#64705f" tick={{ fill: '#01472e', fontSize: 10 }} tickLine={false} axisLine={false} width={80} />
                    <Tooltip cursor={{ fill: 'rgba(1,71,46,0.04)' }} contentStyle={{ backgroundColor: '#ffffff', border: '1px solid rgba(1,71,46,0.12)', borderRadius: '11px', color: '#01472e', fontSize: '11px' }} formatter={(value: any) => [`₹${value.toLocaleString()}`, 'Amount']} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
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

        {/* Row 3: Budget Overview + Subscriptions + Upcoming Bills */}
        <div className="flex gap-6 flex-col md:flex-row">
          {budgets.length > 0 && (
            <GlowCard glowColor="purple" className="flex-1">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-xs text-[#64705f] font-semibold tracking-wider uppercase" style={{ fontFamily: 'var(--font-roboto), Roboto, sans-serif' }}>
                    Category Budgets
                  </h3>
                  <Link href="/budgets" className="text-[10px] text-[#01472e] hover:text-[#01472e]/80 transition-colors duration-[0.6s] flex items-center">
                    Manage <ArrowUpRight className="w-2.5 h-2.5 ml-0.5" />
                  </Link>
                </div>
                <div className="space-y-3">
                  {budgets.slice(0, 4).map((budget: any) => {
                    const pct = budget.amount > 0 ? Math.min(100, Math.round((budget.spent / budget.amount) * 100)) : 0
                    return (
                      <div key={budget.id}>
                        <div className="flex justify-between text-[10px] mb-1">
                          <span className="text-[#01472e] flex items-center gap-1">
                            <span>{budget.categories?.icon || '📊'}</span>
                            {budget.categories?.name || 'Overall'}
                          </span>
                          <span className={`font-semibold ${pct >= 100 ? 'text-[#01472e]' : pct >= 80 ? 'text-[#01472e]' : 'text-[#64705f]'}`}>
                            {pct}%
                          </span>
                        </div>
                        <div className="w-full bg-[#f6f8f1] rounded-full h-1.5 overflow-hidden">
                          <div className={`h-1.5 rounded-full transition-all duration-700 ${pct >= 100 ? 'bg-[#01472e]' : pct >= 80 ? 'bg-[#a3b18a]' : 'bg-[#ccd5ae]'}`}
                            style={{ width: `${Math.min(100, pct)}%` }} />
                        </div>
                        <div className="flex justify-between text-[9px] text-[#64705f] mt-0.5">
                          <span>₹{budget.spent.toLocaleString('en-IN')}</span>
                          <span>₹{budget.amount.toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </GlowCard>
          )}

          <GlowCard glowColor="purple" className="flex-1">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-xs text-[#64705f] font-semibold tracking-wider uppercase" style={{ fontFamily: 'var(--font-roboto), Roboto, sans-serif' }}>
                  Subscriptions
                </h3>
                <Link href="/subscriptions" className="text-[10px] text-[#01472e] hover:text-[#01472e]/80 transition-colors duration-[0.6s] flex items-center">
                  View all <ArrowUpRight className="w-2.5 h-2.5 ml-0.5" />
                </Link>
              </div>
              <div className="flex flex-col items-center justify-center py-6">
                <div className="p-3.5 bg-[#01472e]/10 mb-4">
                  <CreditCard className="w-6 h-6 text-[#01472e]" />
                </div>
                <p className="text-2xl font-bold text-[#01472e]">{subscriptionCount}</p>
                <p className="text-[10px] text-[#64705f] mt-0.5">active subscriptions</p>
                <p className="text-sm font-semibold text-[#01472e] mt-2">
                  ₹{subscriptionMonthlyCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}<span className="text-[10px] font-normal text-[#64705f]">/month</span>
                </p>
              </div>
            </CardContent>
          </GlowCard>

          <GlowCard glowColor="purple" className="flex-1">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-xs text-[#64705f] font-semibold tracking-wider uppercase" style={{ fontFamily: 'var(--font-roboto), Roboto, sans-serif' }}>
                  Upcoming Bills
                </h3>
                <Link href="/bills" className="text-[10px] text-[#01472e] hover:text-[#01472e]/80 transition-colors duration-[0.6s] flex items-center">
                  View all <ArrowUpRight className="w-2.5 h-2.5 ml-0.5" />
                </Link>
              </div>
              <div className="space-y-1">
                {upcomingBills.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6">
                    <Receipt className="w-7 h-7 text-[#64705f]/30 mb-2" />
                    <p className="text-[10px] text-[#64705f]">No upcoming bills</p>
                  </div>
                ) : upcomingBills.map((bill: any) => {
                  const dueDate = new Date(bill.next_due_at)
                  const daysUntil = Math.ceil((dueDate.getTime() - Date.now()) / 86400000)
                  return (
                    <div key={bill.id} className="flex items-center justify-between hover:bg-[#f6f8f1] -mx-2 px-2 py-2 transition-all duration-[0.6s] ease-[cubic-bezier(0.19,1,0.22,1)]">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 flex items-center justify-center border border-[#dde3d0] ${
                          daysUntil <= 0 ? 'bg-[#01472e]/10' : daysUntil <= 3 ? 'bg-[#01472e]/5' : 'bg-[#f6f8f1]'
                        }`}>
                          <Receipt className={`w-3.5 h-3.5 ${
                            daysUntil <= 0 ? 'text-[#01472e]' : daysUntil <= 3 ? 'text-[#01472e]/70' : 'text-[#64705f]'
                          }`} />
                        </div>
                        <div>
                          <p className="text-[11px] font-medium text-[#01472e]">{bill.name}</p>
                          <p className="text-[9px] text-[#64705f]">
                            {daysUntil <= 0 ? 'Overdue' : daysUntil === 1 ? 'Due tomorrow' : `Due in ${daysUntil} days`}
                          </p>
                        </div>
                      </div>
                      {bill.amount_estimate && (
                        <span className="text-[11px] font-semibold text-[#01472e]">
                          ₹{bill.amount_estimate.toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </GlowCard>
        </div>

      </div>
    </div>
  )
}
