'use client'

import { useState } from 'react'
import { generateFinancialInsights } from '@/app/(dashboard)/dashboard/actions'

type Insight = {
  type: 'warning' | 'success' | 'tip'
  text: string
}

export default function AIInsightsWidget() {
  const [insights, setInsights] = useState<Insight[]>([])
  const [loading, setLoading] = useState(false)
  const [hasGenerated, setHasGenerated] = useState(false)

  const handleGenerate = async () => {
    setLoading(true)
    try {
      const data = await generateFinancialInsights()
      setInsights(data)
      setHasGenerated(true)
    } catch (error) {
      console.error(error)
      alert('Failed to generate insights.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative overflow-hidden bg-[#151D2C] rounded-2xl border border-white/5 shadow-xl p-6 lg:col-span-3 mt-8">
      {/* Sparkle background glow */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-indigo-500/10 blur-[100px] pointer-events-none rounded-full" />
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-fuchsia-500/10 blur-[100px] pointer-events-none rounded-full" />

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 relative z-10">
        <div>
          <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-fuchsia-400 flex items-center">
            <svg className="w-5 h-5 mr-2 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            AI Financial Insights
          </h3>
          <p className="text-slate-400 text-sm mt-1">
            Personalized advice based on your last 30 days of spending
          </p>
        </div>
        
        {!hasGenerated && (
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="mt-4 md:mt-0 relative group overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 p-[1px] transition-all hover:shadow-[0_0_20px_rgba(99,102,241,0.4)]"
          >
            <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative bg-[#0B1121] px-6 py-2 rounded-xl transition-all group-hover:bg-transparent">
              <span className="text-sm font-semibold text-white flex items-center">
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Analyzing Data...
                  </>
                ) : (
                  <>
                    <span className="mr-2">✨</span> Generate Insights
                  </>
                )}
              </span>
            </div>
          </button>
        )}
      </div>

      {loading && hasGenerated && (
        <div className="space-y-4 animate-pulse relative z-10">
          <div className="h-16 bg-white/5 rounded-xl border border-white/5" />
          <div className="h-16 bg-white/5 rounded-xl border border-white/5" />
          <div className="h-16 bg-white/5 rounded-xl border border-white/5" />
        </div>
      )}

      {insights.length > 0 && !loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {insights.map((insight, idx) => {
            let icon = '💡'
            let colorClass = 'text-blue-400 bg-blue-500/10 border-blue-500/20'
            
            if (insight.type === 'warning') {
              icon = '⚠️'
              colorClass = 'text-amber-400 bg-amber-500/10 border-amber-500/20'
            } else if (insight.type === 'success') {
              icon = '🎉'
              colorClass = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
            } else if (insight.type === 'tip') {
              icon = '💡'
              colorClass = 'text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/20'
            }

            return (
              <div key={idx} className={`rounded-xl p-5 border backdrop-blur-sm flex flex-col ${colorClass} transition-all hover:scale-[1.02]`}>
                <div className="text-2xl mb-3">{icon}</div>
                <p className="text-sm font-medium text-slate-200 leading-relaxed">
                  {insight.text}
                </p>
              </div>
            )
          })}
        </div>
      )}
      
      {hasGenerated && !loading && (
        <div className="mt-6 flex justify-end relative z-10">
          <button 
            onClick={handleGenerate}
            className="text-xs text-slate-500 hover:text-indigo-400 transition-colors flex items-center"
          >
            <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            Refresh Insights
          </button>
        </div>
      )}
    </div>
  )
}
