'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { TrendingUp } from 'lucide-react'
import type { TrendsData } from '@/lib/api/dashboard'

const SERIES_COLORS = ['#01472e', '#64705f', '#a3b18a', '#ccd5ae', '#0d9488', '#b45309']

export default function TrendsCard({
  trends,
  currentMonth,
}: {
  trends: TrendsData
  currentMonth: string
}) {
  const router = useRouter()
  const [window, setWindow] = useState(6)

  const slice = useMemo(() => trends.months.slice(-window), [trends.months, window])
  const sliceStart = trends.months.length - slice.length

  const composed = useMemo(
    () =>
      slice.map(m => ({
        month: m.month,
        name: m.label.replace(/ \d{4}$/, ''),
        income: m.income,
        expenses: m.expenses,
        savingsRate: m.savingsRate,
      })),
    [slice]
  )

  const stacked = useMemo(
    () =>
      slice.map((m, i) => {
        const row = trends.series[sliceStart + i]
        return {
          month: m.month,
          name: m.label.replace(/ \d{4}$/, ''),
          ...(row?.values ?? {}),
        }
      }),
    [slice, trends.series, sliceStart]
  )

  const isEmpty =
    trends.months.length === 0 ||
    trends.months.every(m => m.income === 0 && m.expenses === 0)

  const jump = (month?: string) => {
    if (!month || month > currentMonth) return
    router.push(`/dashboard?month=${month}`)
  }

  return (
    <section
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid rgba(1,71,46,0.1)',
        borderRadius: '16px',
        padding: '22px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '18px',
      }}
    >
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[#01472e]" />
          <h3 className="text-xs text-[#64705f] font-semibold tracking-wider uppercase">Trends</h3>
        </div>
        <div className="flex gap-1">
          {[6, 9, 12].map(n => (
            <button
              key={n}
              onClick={() => setWindow(n)}
              style={{
                padding: '5px 12px',
                borderRadius: '999px',
                fontSize: '11px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: window === n ? '#01472e' : '#f0f2ea',
                color: window === n ? '#fefae0' : '#64705f',
              }}
            >
              {n}M
            </button>
          ))}
        </div>
      </div>

      {isEmpty ? (
        <p className="text-sm text-[#64705f] py-6 text-center">
          Not enough data yet — import statements to see trends.
        </p>
      ) : (
        <>
          <div>
            <p className="text-[10px] text-[#64705f] font-semibold uppercase tracking-wider mb-2">
              Income vs expenses (₹) · savings rate (%)
            </p>
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={composed} margin={{ top: 4, right: 8, bottom: 0, left: -12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef1e7" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64705f' }} />
                <YAxis yAxisId="rs" tick={{ fontSize: 10, fill: '#64705f' }} />
                <YAxis
                  yAxisId="pct"
                  orientation="right"
                  domain={[0, 100]}
                  tick={{ fontSize: 10, fill: '#64705f' }}
                  unit="%"
                />
                <Tooltip
                  formatter={(value, name) =>
                    name === 'Savings rate'
                      ? [`${value}%`, name]
                      : [`₹${Number(value).toLocaleString('en-IN')}`, name]
                  }
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar
                  yAxisId="rs"
                  dataKey="income"
                  name="Income"
                  fill="#01472e"
                  radius={[3, 3, 0, 0]}
                  onClick={(data: { payload?: { month?: string } }) => jump(data?.payload?.month)}
                  />
                <Bar
                  yAxisId="rs"
                  dataKey="expenses"
                  name="Expenses"
                  fill="#a3b18a"
                  radius={[3, 3, 0, 0]}
                  onClick={(data: { payload?: { month?: string } }) => jump(data?.payload?.month)}
                  />
                <Line
                  yAxisId="pct"
                  type="monotone"
                  dataKey="savingsRate"
                  name="Savings rate"
                  stroke="#b45309"
                  strokeWidth={2}
                  dot={{ r: 2.5 }}
                  connectNulls
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {trends.categories.length > 0 && (
            <div>
              <p className="text-[10px] text-[#64705f] font-semibold uppercase tracking-wider mb-2">
                Spend by category (₹)
              </p>
              <ResponsiveContainer width="100%" height={240}>
                <ComposedChart data={stacked} margin={{ top: 4, right: 8, bottom: 0, left: -12 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef1e7" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64705f' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#64705f' }} />
                  <Tooltip
                    formatter={(value, name) => [
                      `₹${Number(value).toLocaleString('en-IN')}`,
                      String(name),
                    ]}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {trends.categories.map((c, i) => (
                    <Bar
                      key={c.key}
                      dataKey={c.key}
                      name={c.name}
                      stackId="spend"
                      fill={SERIES_COLORS[i % SERIES_COLORS.length]}
                      onClick={(data: { payload?: { month?: string } }) => jump(data?.payload?.month)}
                    />
                  ))}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </section>
  )
}
