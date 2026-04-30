'use client'

import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts'

export default function AnalyticsCharts({ transactions }: { transactions: any[] }) {
  // 1. Process data for Line Chart (Last 7 Days Spending)
  const last7Days = new Map()
  const today = new Date()
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    last7Days.set(dateStr, 0)
  }

  // 2. Process data for Bar Chart (Category Breakdown)
  const categoryTotals = new Map<string, number>()

  transactions.forEach(tx => {
    // Only process expenses (negative amount)
    if (tx.amount >= 0) return
    const amountStr = Math.abs(tx.amount)

    // Populate Line Chart
    const txDate = new Date(tx.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    if (last7Days.has(txDate)) {
      last7Days.set(txDate, last7Days.get(txDate) + amountStr)
    }

    // Populate Bar Chart
    const catName = tx.categories?.name || 'Uncategorised'
    categoryTotals.set(catName, (categoryTotals.get(catName) || 0) + amountStr)
  })

  const lineChartData = Array.from(last7Days, ([name, value]) => ({ name, value }))
  
  const barChartData = Array.from(categoryTotals, ([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5) // Top 5 categories

  const COLORS = ['#818cf8', '#34d399', '#f472b6', '#fbbf24', '#38bdf8']

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      
      {/* Spending Over Time (Line Chart) */}
      <div className="bg-[#151D2C] rounded-2xl border border-white/5 shadow-xl p-6 h-96 flex flex-col">
        <h3 className="text-slate-400 font-medium tracking-wide mb-6">Spending Trend (Last 7 Days)</h3>
        <div className="flex-1 w-full h-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={lineChartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
              <XAxis dataKey="name" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis stroke="#64748b" tick={{ fill: '#64748b', fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value}`} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0F1523', border: '1px solid #ffffff10', borderRadius: '8px', color: '#fff' }}
                itemStyle={{ color: '#818cf8' }}
                formatter={(value: any) => [`₹${value.toLocaleString()}`, 'Spent']}
              />
              <Line type="monotone" dataKey="value" stroke="#818cf8" strokeWidth={3} dot={{ fill: '#818cf8', strokeWidth: 2, r: 4 }} activeDot={{ r: 6, fill: '#fff' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Categories (Bar Chart) */}
      <div className="bg-[#151D2C] rounded-2xl border border-white/5 shadow-xl p-6 h-96 flex flex-col">
        <h3 className="text-slate-400 font-medium tracking-wide mb-6">Top Categories (All Time)</h3>
        <div className="flex-1 w-full h-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barChartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" horizontal={false} />
              <XAxis type="number" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis dataKey="name" type="category" stroke="#64748b" tick={{ fill: '#cbd5e1', fontSize: 12 }} tickLine={false} axisLine={false} width={100} />
              <Tooltip 
                cursor={{ fill: '#ffffff05' }}
                contentStyle={{ backgroundColor: '#0F1523', border: '1px solid #ffffff10', borderRadius: '8px', color: '#fff' }}
                formatter={(value: any) => [`₹${value.toLocaleString()}`, 'Amount']}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {barChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  )
}
