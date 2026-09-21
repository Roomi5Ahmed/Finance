'use client'

import { useState } from 'react'
import { generateCategoryInsights } from '@/app/(dashboard)/insights/actions'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { GlowCard } from '@/components/ui/spotlight-card'
import { GlowButton } from '@/components/ui/glow-button'

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
    <GlowCard glowColor="purple" className="flex flex-col transition-all duration-[0.6s] ease-[cubic-bezier(0.19,1,0.22,1)]">
      
      {/* Top Header Section */}
      <div className="p-6 pb-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div 
              className="w-11 h-11 rounded-[0px] flex items-center justify-center text-xl border border-white/5 shrink-0"
              style={{ backgroundColor: `${category.color}15` }}
            >
              {category.icon}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-white tracking-wide truncate" style={{ fontFamily: 'var(--font-inter)' }}>{category.name}</h3>
              <p className="text-[#8C8C8C] text-xs" style={{ fontFamily: 'var(--font-roboto)' }}>
                {category.merchants.length} Merchant{category.merchants.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="text-right shrink-0 ml-3">
            <p className="text-base font-bold text-white">&#8377;{category.totalSpent.toLocaleString('en-IN')}</p>
            <p className="text-[#8C8C8C] text-xs">{percentage}% of budget</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-3 w-full bg-white/5 rounded-full h-1 overflow-hidden">
          <div 
            className="h-1 rounded-full transition-all duration-[0.6s] ease-[cubic-bezier(0.19,1,0.22,1)]"
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
              contentStyle={{ backgroundColor: '#181818', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '11px', color: '#EFEFEF', fontSize: '12px', padding: '6px 10px' }}
              itemStyle={{ color: '#EFEFEF' }}
              formatter={(value: number) => [`&#8377;${value.toLocaleString('en-IN')}`, 'Spent']}
              labelStyle={{ color: '#8C8C8C', fontSize: '11px' }}
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
      <div className="p-6 pt-4 bg-[#181818]/50 flex-1 flex flex-col justify-end border-t border-white/5">
        {!hasGenerated && !loading && (
          <button
            onClick={handleGenerate}
            className="w-full flex items-center justify-center px-3 py-2 text-[#FF98A2] text-xs font-medium bg-[#181818] rounded-[0px] border border-white/5 hover:bg-white/5 transition-colors duration-[0.6s] ease-[cubic-bezier(0.19,1,0.22,1)]"
          >
            <span className="mr-1.5">&#10024;</span> Generate Optimizations
          </button>
        )}

        {loading && (
          <div className="space-y-2 animate-pulse">
            <div className="h-10 bg-[#FF98A2]/10 rounded-[0px]" />
            <div className="h-10 bg-[#FF98A2]/10 rounded-[0px]" />
          </div>
        )}

        {hasGenerated && !loading && tips.length > 0 && (
          <div className="space-y-2 animate-in">
            {tips.map((tip, idx) => (
              <div key={idx} className="flex items-start bg-[#FF98A2]/5 border border-[#FF98A2]/10 rounded-[0px] p-3">
                <span className="text-[#FF98A2] mr-2 mt-0.5 text-sm shrink-0">&#128161;</span>
                <p className="text-xs text-[#EFEFEF] leading-relaxed flex-1">{tip}</p>
              </div>
            ))}
            
            <button 
              onClick={handleGenerate}
              className="text-[10px] text-[#8C8C8C]/50 hover:text-[#FF98A2] transition-colors duration-[0.6s] ease-[cubic-bezier(0.19,1,0.22,1)] flex items-center pt-1 justify-end w-full"
            >
              <svg className="w-2.5 h-2.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              Refresh Tips
            </button>
          </div>
        )}
      </div>
    </GlowCard>
  )
}
