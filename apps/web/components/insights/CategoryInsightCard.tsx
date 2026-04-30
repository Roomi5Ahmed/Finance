'use client'

import { useState } from 'react'
import { generateCategoryInsights } from '@/app/(dashboard)/insights/actions'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

type CategoryData = {
  name: string
  icon: string
  color: string
  totalSpent: number
  merchants: string[]
  history: { date: string; amount: number }[]
}

export default function CategoryInsightCard({ category, globalBudget }: { category: CategoryData, globalBudget: number }) {
  const [tips, setTips] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [hasGenerated, setHasGenerated] = useState(false)

  const percentage = Math.min(100, Math.round((category.totalSpent / globalBudget) * 100))

  const handleGenerate = async () => {
    setLoading(true)
    try {
      const data = await generateCategoryInsights(category.name, category.merchants)
      setTips(data)
      setHasGenerated(true)
    } catch (error) {
      console.error(error)
      alert('Failed to generate insights.')
    } finally {
      setLoading(false)
    }
  }

  // Format chart data (fill in gaps if only 1 data point)
  const chartData = category.history.length === 1 
    ? [{ date: 'Start', amount: 0 }, ...category.history] 
    : category.history

  // Sanitise category name for gradient ID (remove spaces/special chars)
  const gradientId = `gradient-${category.name.replace(/[^a-zA-Z0-9]/g, '')}`

  return (
    <div className="bg-[#151D2C] rounded-xl border border-white/5 shadow-xl overflow-hidden flex flex-col transition-all hover:border-white/10">
      
      {/* Top Header Section */}
      <div className="p-5 pb-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center text-xl border border-white/5 shrink-0"
              style={{ backgroundColor: `${category.color}15` }}
            >
              {category.icon}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-white tracking-wide truncate">{category.name}</h3>
              <p className="text-slate-500 text-xs">
                {category.merchants.length} Merchant{category.merchants.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="text-right shrink-0 ml-3">
            <p className="text-base font-bold text-white">₹{category.totalSpent.toLocaleString('en-IN')}</p>
            <p className="text-slate-500 text-xs">{percentage}% of budget</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-3 w-full bg-slate-800/60 rounded-full h-1 overflow-hidden">
          <div 
            className="h-1 rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${percentage}%`, backgroundColor: category.color }}
          ></div>
        </div>
      </div>

      {/* Mini Chart Section */}
      <div className="h-20 w-full mt-3 opacity-80 px-3">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={category.color} stopOpacity={0.25}/>
                <stop offset="95%" stopColor={category.color} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <Tooltip 
              contentStyle={{ backgroundColor: '#0B1121', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '12px', padding: '6px 10px' }}
              itemStyle={{ color: '#fff' }}
              formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, 'Spent']}
              labelStyle={{ color: '#94a3b8', fontSize: '11px' }}
            />
            <Area 
              type="monotone" 
              dataKey="amount" 
              stroke={category.color} 
              fillOpacity={1} 
              fill={`url(#${gradientId})`} 
              strokeWidth={1.5}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* AI Tips Section */}
      <div className="p-5 pt-3 bg-[#0B1121]/20 flex-1 flex flex-col justify-end border-t border-white/[0.03]">
        {!hasGenerated && !loading && (
          <button
            onClick={handleGenerate}
            className="w-full flex items-center justify-center px-3 py-2 rounded-lg border border-indigo-500/20 text-indigo-400 text-xs font-medium hover:bg-indigo-500/10 transition-colors"
          >
            <span className="mr-1.5">✨</span> Generate Optimizations
          </button>
        )}

        {loading && (
          <div className="space-y-2 animate-pulse">
            <div className="h-10 bg-indigo-500/10 rounded-lg" />
            <div className="h-10 bg-indigo-500/10 rounded-lg" />
          </div>
        )}

        {hasGenerated && !loading && tips.length > 0 && (
          <div className="space-y-2 animate-in">
            {tips.map((tip, idx) => (
              <div key={idx} className="flex items-start bg-indigo-500/5 border border-indigo-500/10 rounded-lg p-3">
                <span className="text-indigo-400 mr-2 mt-0.5 text-sm shrink-0">💡</span>
                <p className="text-xs text-slate-300 leading-relaxed flex-1">{tip}</p>
              </div>
            ))}
            
            <button 
              onClick={handleGenerate}
              className="text-[10px] text-slate-500 hover:text-indigo-400 transition-colors flex items-center pt-1 justify-end w-full"
            >
              <svg className="w-2.5 h-2.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              Refresh Tips
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
