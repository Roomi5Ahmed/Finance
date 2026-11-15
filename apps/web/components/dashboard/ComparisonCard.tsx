'use client'

import { ArrowUpRight, ArrowDownRight } from 'lucide-react'
import type { ComparisonKpi, MonthComparison } from '@/lib/api/dashboard'

function KpiBox({
  label,
  kpi,
  goodWhenUp,
}: {
  label: string
  kpi: ComparisonKpi
  goodWhenUp: boolean
}) {
  const up = kpi.change > 0
  const flat = kpi.change === 0
  const good = flat ? null : up === goodWhenUp
  const color = good === null ? '#64705f' : good ? '#01472e' : '#b45309'
  const Arrow = up ? ArrowUpRight : ArrowDownRight

  return (
    <div className="flex-1" style={{ padding: '14px 16px', backgroundColor: '#f6f8f1', borderRadius: '12px' }}>
      <p className="text-[10px] text-[#64705f] font-semibold uppercase tracking-wider">{label}</p>
      <div className="flex items-baseline gap-2 mt-1.5">
        <span className="text-lg font-bold text-[#01472e]">₹{kpi.current.toLocaleString('en-IN')}</span>
        <span className="text-[11px] text-[#64705f]">vs ₹{kpi.previous.toLocaleString('en-IN')}</span>
      </div>
      <div className="flex items-center gap-1 mt-1" style={{ color }}>
        {flat ? (
          <span className="text-[11px] font-semibold">no change</span>
        ) : (
          <>
            <Arrow className="w-3.5 h-3.5" />
            <span className="text-[11px] font-semibold">
              {up ? '+' : ''}₹{Math.abs(kpi.change).toLocaleString('en-IN')}
              {kpi.pct !== null ? ` (${up ? '+' : ''}${kpi.pct}%)` : ''}
            </span>
          </>
        )}
      </div>
    </div>
  )
}

export default function ComparisonCard({ comparison }: { comparison: MonthComparison }) {
  const rows = comparison.categories.slice(0, 8)
  const biggestIncreases = comparison.categories
    .filter(c => c.change > 0)
    .slice(0, 3)
    .map(c => `${c.categoryId || 'uncategorised'}|${c.name}`)
  const highlight = new Set(biggestIncreases)

  return (
    <section
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid rgba(1,71,46,0.1)',
        borderRadius: '16px',
        padding: '22px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-xs text-[#64705f] font-semibold tracking-wider uppercase">
          Month comparison
        </h3>
        <span className="text-[11px] text-[#01472e] font-medium">vs {comparison.previousLabel}</span>
      </div>

      <div className="flex gap-3 flex-col sm:flex-row">
        <KpiBox label="Income" kpi={comparison.income} goodWhenUp />
        <KpiBox label="Expenses" kpi={comparison.expenses} goodWhenUp={false} />
        <KpiBox label="Savings" kpi={comparison.savings} goodWhenUp />
      </div>

      {rows.length > 0 && (
        <div className="overflow-x-auto">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ color: '#64705f', textAlign: 'left' }}>
                <th className="font-semibold uppercase text-[10px] tracking-wider" style={{ padding: '6px 8px' }}>
                  Category
                </th>
                <th className="font-semibold uppercase text-[10px] tracking-wider text-right" style={{ padding: '6px 8px' }}>
                  This month
                </th>
                <th className="font-semibold uppercase text-[10px] tracking-wider text-right" style={{ padding: '6px 8px' }}>
                  Prev month
                </th>
                <th className="font-semibold uppercase text-[10px] tracking-wider text-right" style={{ padding: '6px 8px' }}>
                  Change
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(c => {
                const key = `${c.categoryId || 'uncategorised'}|${c.name}`
                const hot = highlight.has(key)
                return (
                  <tr
                    key={key}
                    style={{
                      borderTop: '1px solid #f0f2ea',
                      backgroundColor: hot ? 'rgba(180,83,9,0.06)' : 'transparent',
                    }}
                  >
                    <td style={{ padding: '8px', color: '#01472e', fontWeight: hot ? 700 : 500 }}>
                      <span className="mr-1.5">{c.icon || '❔'}</span>
                      {c.name}
                      {hot && (
                        <span
                          className="ml-2 text-[9px] font-bold uppercase"
                          style={{ color: '#b45309' }}
                        >
                          biggest increase
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right', color: '#01472e' }}>
                      ₹{c.current.toLocaleString('en-IN')}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right', color: '#64705f' }}>
                      ₹{c.previous.toLocaleString('en-IN')}
                    </td>
                    <td
                      style={{
                        padding: '8px',
                        textAlign: 'right',
                        fontWeight: 600,
                        color: c.change > 0 ? '#b45309' : c.change < 0 ? '#01472e' : '#64705f',
                      }}
                    >
                      {c.change > 0 ? '+' : ''}
                      {c.pct !== null ? `${c.pct}%` : c.change > 0 ? 'new' : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
