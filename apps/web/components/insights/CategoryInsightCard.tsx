'use client'

import { useState } from 'react'
import { generateCategoryInsights } from '@/app/(dashboard)/insights/actions'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { GlowCard } from '@/components/ui/spotlight-card'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

type MerchantSpend = { name: string; spend: number }

type CategoryData = {
  name: string
  icon: string
  color: string
  totalSpent: number
  merchants: string[]
  merchantSpend: MerchantSpend[]
  history: { date: string; amount: number }[]
  transactionCount: number
  avgTransactionSize: number
  momChange: number | null
  lastMonthSpent: number
  budgetPercentage: number
}

export default function CategoryInsightCard({ category, globalBudget }: { category: CategoryData, globalBudget: number }) {
  const [tips, setTips] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [hasGenerated, setHasGenerated] = useState(false)

  const handleGenerate = async () => {
    setLoading(true)
    try {
      const data = await generateCategoryInsights({
        name: category.name,
        totalSpent: category.totalSpent,
        budgetPercentage: category.budgetPercentage,
        transactionCount: category.transactionCount,
        avgTransactionSize: category.avgTransactionSize,
        momChange: category.momChange,
        lastMonthSpent: category.lastMonthSpent,
        merchantSpend: category.merchantSpend,
        monthlyBudget: globalBudget,
      })
      setTips(data)
      setHasGenerated(true)
    } catch (error) {
      console.error(error)
      alert('Failed to generate insights.')
    } finally {
      setLoading(false)
    }
  }

  const chartData = category.history.length === 1 
    ? [{ date: 'Start', amount: 0 }, ...category.history] 
    : category.history

  const gradientId = "gradient-" + category.name.replace(/[^a-zA-Z0-9]/g, '')

  return (
    <GlowCard glowColor="purple" className="flex flex-col transition-all duration-[0.6s] ease-[cubic-bezier(0.19,1,0.22,1)]">
      
      {/* Top Header Section */}
      <div className="p-6 pb-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div 
              className="w-11 h-11 rounded-[0px] flex items-center justify-center text-xl border border-white/5 shrink-0"
              style={{ backgroundColor: category.color + '15' }}
            >
              {category.icon}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-white tracking-wide truncate" style={{ fontFamily: 'var(--font-inter)' }}>{category.name}</h3>
              <p className="text-[#8C8C8C] text-xs" style={{ fontFamily: 'var(--font-roboto)' }}>
                {category.transactionCount} transaction{category.transactionCount !== 1 ? 's' : ''} · {category.merchants.length} merchant{category.merchants.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="text-right shrink-0 ml-3">
            <p className="text-base font-bold text-white">{'\u20B9'}{category.totalSpent.toLocaleString('en-IN')}</p>
            <p className="text-[#8C8C8C] text-xs">{category.budgetPercentage}% of budget</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-3 w-full bg-white/5 rounded-full h-1 overflow-hidden">
          <div 
            className="h-1 rounded-full transition-all duration-[0.6s] ease-[cubic-bezier(0.19,1,0.22,1)]"
            style={{ width: Math.min(100, category.budgetPercentage) + '%', backgroundColor: category.color }}
          ></div>
        </div>

        {/* Stats Row */}
        <div className="flex items-center gap-4 mt-3 text-[10px] text-[#8C8C8C]" style={{ fontFamily: 'var(--font-roboto)' }}>
          <span>Avg {'\u20B9'}{category.avgTransactionSize.toLocaleString('en-IN')}/txn</span>
          <span className="text-white/10">|</span>
          {category.momChange !== null ? (
            <span className={`flex items-center gap-0.5 ${category.momChange > 0 ? 'text-[#FF98A2]' : 'text-[#EFEFEF]'}`}>
              {category.momChange > 0 ? (
                <TrendingUp className="w-2.5 h-2.5" />
              ) : category.momChange < 0 ? (
                <TrendingDown className="w-2.5 h-2.5" />
              ) : (
                <Minus className="w-2.5 h-2.5" />
              )}
              {category.momChange > 0 ? '+' : ''}{category.momChange}% MoM
            </span>
          ) : (
            <span className="text-[#8C8C8C]/50">New category</span>
          )}
        </div>
      </div>

      {/* Top Merchants */}
      {category.merchantSpend.length > 0 && (
        <div className="px-6 pt-3">
          <p className="text-[9px] text-[#8C8C8C] uppercase tracking-wider mb-1.5" style={{ fontFamily: 'var(--font-roboto)' }}>Top Merchants</p>
          <div className="space-y-1">
            {category.merchantSpend.slice(0, 3).map((m) => {
              const pct = Math.round((m.spend / category.totalSpent) * 100)
              return (
                <div key={m.name} className="flex items-center justify-between text-[10px]">
                  <span className="text-[#EFEFEF] truncate max-w-[60%]">{m.name}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: pct + '%', backgroundColor: category.color + 'AA' }} />
                    </div>
                    <span className="text-[#8C8C8C] w-16 text-right">{'\u20B9'}{m.spend.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

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
              formatter={(value: any) => ['\u20B9' + Number(value).toLocaleString('en-IN'), 'Spent']}
              labelStyle={{ color: '#8C8C8C', fontSize: '11px' }}
            />
            <Area 
              type="monotone" 
              dataKey="amount" 
              stroke={category.color} 
              fillOpacity={1} 
              fill={'url(#' + gradientId + ')'} 
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
            className="w-full flex items-center justify-center px-3 py-2.5 text-[#FF98A2] text-xs font-medium bg-[#181818] rounded-[0px] border border-white/5 hover:bg-white/5 transition-colors duration-[0.6s] ease-[cubic-bezier(0.19,1,0.22,1)]"
          >
            <span className="mr-1.5">{'\u2728'}</span> Generate AI Insights
          </button>
        )}

        {loading && (
          <div className="space-y-2.5 animate-pulse">
            <div className="h-12 bg-[#FF98A2]/10 rounded-[0px]" />
            <div className="h-12 bg-[#FF98A2]/10 rounded-[0px]" />
            <div className="h-12 bg-[#FF98A2]/10 rounded-[0px]" />
          </div>
        )}

        {hasGenerated && !loading && tips.length > 0 && (
          <div className="space-y-2 animate-in">
            {tips.map((tip, idx) => (
              <div key={idx} className="flex items-start bg-[#FF98A2]/5 border border-[#FF98A2]/10 rounded-[0px] p-3">
                <span className="text-[#FF98A2] mr-2 mt-0.5 text-sm shrink-0">{'\uD83D\uDCA1'}</span>
                <p className="text-[11px] text-[#EFEFEF] leading-relaxed flex-1">{tip}</p>
              </div>
            ))}
            
            <button 
              onClick={handleGenerate}
              className="text-[10px] text-[#8C8C8C]/50 hover:text-[#FF98A2] transition-colors duration-[0.6s] ease-[cubic-bezier(0.19,1,0.22,1)] flex items-center pt-1 justify-end w-full"
            >
              <svg className="w-2.5 h-2.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              Regenerate
            </button>
          </div>
        )}
      </div>
    </GlowCard>
  )
}
