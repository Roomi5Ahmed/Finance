import React, { useState, useEffect, useCallback, useRef } from 'react'
import { View, Text, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity, Alert, PanResponder } from 'react-native'
import { BarChart } from 'react-native-gifted-charts'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { Colors } from '../../constants/theme'
import {
  api,
  type AvailableMonth,
  type DashboardMonthPayload,
  type TrendsPayload,
} from '../../lib/api'

function formatINR(n: number) {
  return '\u20B9' + Math.round(n).toLocaleString('en-IN')
}

function KPICard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: Colors.surface, padding: 16, borderWidth: 1, borderColor: Colors.border }}>
      <Text style={{ fontFamily: 'Roboto_900Black', fontSize: 10, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>
        {label}
      </Text>
      <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 18, fontWeight: '700', color: accent || Colors.foreground }}>
        {value}
      </Text>
    </View>
  )
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const TZ_OFFSET_MS = 330 * 60_000 // Asia/Kolkata, matches apps/web/lib/api/dashboard.ts

function currentMonthKeyLocal(): string {
  const d = new Date(Date.now() + TZ_OFFSET_MS)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

function shiftMonthKey(month: string, delta: number): string | null {
  const [y, m] = month.split('-').map(Number)
  if (!y || !m) return null
  const d = new Date(Date.UTC(y, m - 1 + delta, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

function monthLabel(month: string, long = true): string {
  const [y, m] = month.split('-').map(Number)
  if (!y || !m) return month
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-IN', {
    month: long ? 'long' : 'short',
    year: long ? 'numeric' : undefined,
    timeZone: 'UTC',
  })
}

interface TopSub {
  merchant_normalized: string | null
  avg_amount: number | string
}

export default function DashboardScreen() {
  const { session, signOut } = useAuth()
  const [refreshing, setRefreshing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [months, setMonths] = useState<AvailableMonth[]>([])
  const [month, setMonth] = useState<string | null>(null)
  const [data, setData] = useState<DashboardMonthPayload | null>(null)
  const [trends, setTrends] = useState<TrendsPayload | null>(null)
  const [topSubs, setTopSubs] = useState<TopSub[]>([])
  const cache = useRef(new Map<string, DashboardMonthPayload>())
  const reqId = useRef(0)

  const loadMonth = useCallback(async (m: string, silent = false) => {
    const cached = cache.current.get(m)
    if (cached) {
      if (!silent) setData(cached)
      return
    }
    const id = silent ? -1 : ++reqId.current
    if (!silent) setLoading(true)
    try {
      const json: DashboardMonthPayload = await api.getDashboard(m)
      cache.current.set(m, json)
      if (!silent && id === reqId.current) setData(json)
    } catch (err) {
      if (!silent && id === reqId.current) {
        Alert.alert('Error', err instanceof Error ? err.message : 'Failed to load month')
      }
    } finally {
      if (!silent && id === reqId.current) setLoading(false)
    }
  }, [])

  const prefetch = useCallback((m: string) => {
    for (const delta of [-1, 1]) {
      const key = shiftMonthKey(m, delta)
      if (key && !cache.current.has(key)) void loadMonth(key, true)
    }
  }, [loadMonth])

  const goMonth = useCallback((m: string) => {
    setMonth(m)
  }, [])

  // Discover months that have data; default to the newest (current) month.
  useEffect(() => {
    if (!session) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await api.getDashboardMonths()
        if (cancelled) return
        const list: AvailableMonth[] = res.months || []
        setMonths(list)
        setMonth(prev => prev ?? list[0]?.month ?? currentMonthKeyLocal())
      } catch {
        if (!cancelled) setMonth(prev => prev ?? currentMonthKeyLocal())
      }
    })()
    return () => { cancelled = true }
  }, [session])

  useEffect(() => {
    if (!month) return
    loadMonth(month)
    prefetch(month)
  }, [month, loadMonth, prefetch])

  useEffect(() => {
    if (!session) return
    let cancelled = false
    api.getTrends(6)
      .then((res: TrendsPayload) => { if (!cancelled) setTrends(res) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [session])

  // Top subscriptions list only makes sense for the current month.
  useEffect(() => {
    if (!session || !data?.isCurrentMonth) {
      setTopSubs([])
      return
    }
    let cancelled = false
    ;(async () => {
      const { data: subs } = await supabase
        .from('subscriptions')
        .select('merchant_normalized, avg_amount')
        .eq('user_id', session.user.id)
        .eq('status', 'active')
        .order('avg_amount', { ascending: false })
        .limit(3)
      if (!cancelled) setTopSubs((subs as TopSub[]) || [])
    })()
    return () => { cancelled = true }
  }, [session, data])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    if (month) {
      cache.current.delete(month)
      await loadMonth(month)
    }
    setRefreshing(false)
  }, [month, loadMonth])

  const currentKey = months[0]?.month ?? currentMonthKeyLocal()
  const earliestKey = months[months.length - 1]?.month ?? currentKey

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_e, g) =>
      Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
    onPanResponderRelease: (_e, g) => {
      if (!month) return
      const target = g.dx < -50 ? shiftMonthKey(month, 1) : g.dx > 50 ? shiftMonthKey(month, -1) : null
      if (target && target <= currentKey && target >= earliestKey) goMonth(target)
    },
  })

  const openPicker = useCallback(() => {
    if (months.length === 0) return
    Alert.alert(
      'Jump to month',
      undefined,
      [
        ...months.slice(0, 20).map(m => ({
          text: `${monthLabel(m.month)}${m.txn_count > 0 ? '' : ' (no data)'}`,
          onPress: () => goMonth(m.month),
        })),
        { text: 'Cancel', style: 'cancel' as const },
      ],
      { cancelable: true }
    )
  }, [months, goMonth])

  if (!data) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    )
  }

  const budgetPct = data.monthlyBudget > 0
    ? Math.min(100, Math.round((data.expenses / data.monthlyBudget) * 100))
    : 0
  const ringColor = budgetPct >= 100 ? Colors.danger : budgetPct >= 80 ? Colors.warning : Colors.primary
  const hasData = data.transactions.length > 0

  let spendTrend: { value: number; label: string; frontColor: string }[] = []
  if (data.isCurrentMonth) {
    const now = new Date()
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const dayStart = new Date(d)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(d)
      dayEnd.setHours(23, 59, 59, 999)
      const daySpend = data.transactions
        .filter(tx => {
          const txDate = new Date(tx.date)
          return tx.amount < 0 && txDate >= dayStart && txDate <= dayEnd
        })
        .reduce((s, tx) => s + Math.abs(tx.amount), 0)
      spendTrend.push({ value: Math.round(daySpend), label: DAY_LABELS[d.getDay()], frontColor: Colors.primary })
    }
  } else {
    spendTrend = data.dailySeries.map(p => ({
      value: Math.round(p.value),
      label: p.day % 5 === 0 || p.day === 1 ? String(p.day) : '',
      frontColor: Colors.primary,
    }))
  }
  const trendMax = Math.max(...spendTrend.map(d => d.value), 100)

  const catColors = [Colors.primary, '#818cf8', '#38bdf8', '#34d399', '#fbbf24']
  const topCategories = data.categories.slice(0, 5).map((c, i) => ({
    value: Math.round(c.value),
    label: c.name.length > 8 ? c.name.slice(0, 7) + '…' : c.name,
    frontColor: catColors[i % catColors.length],
  }))
  const catMax = Math.max(...topCategories.map(c => c.value), 100)

  const trendMaxAll = Math.max(
    ...(trends?.months.map(m => Math.max(m.income, m.expenses)) ?? [1]),
    1
  )

  const canPrev = month !== null && month > earliestKey
  const canNext = month !== null && month < currentKey

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: Colors.background }}
      contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 26, color: Colors.foreground, fontWeight: '700' }}>
          Dashboard
        </Text>
        <TouchableOpacity onPress={() => Alert.alert('Sign Out', 'Are you sure?', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign Out', style: 'destructive', onPress: () => signOut() },
        ])}
          style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
          <Text style={{ color: Colors.muted, fontSize: 13 }}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Month selector — arrows, tap for picker, swipe across the row */}
      <View {...panResponder.panHandlers} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <TouchableOpacity
          disabled={!canPrev}
          onPress={() => { const t = month ? shiftMonthKey(month, -1) : null; if (t && canPrev) goMonth(t) }}
          style={{ paddingHorizontal: 14, paddingVertical: 8, opacity: canPrev ? 1 : 0.3 }}
        >
          <Text style={{ color: Colors.foreground, fontSize: 20, fontWeight: '600' }}>‹</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={openPicker} style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border }}>
          <Text style={{ color: Colors.foreground, fontSize: 14, fontWeight: '700' }}>
            {month ? monthLabel(month) : '—'}
          </Text>
        </TouchableOpacity>
        {loading && (
          <ActivityIndicator size="small" color={Colors.primary} style={{ marginLeft: -4 }} />
        )}
        <TouchableOpacity
          disabled={!canNext}
          onPress={() => { const t = month ? shiftMonthKey(month, 1) : null; if (t && canNext) goMonth(t) }}
          style={{ paddingHorizontal: 14, paddingVertical: 8, opacity: canNext ? 1 : 0.3 }}
        >
          <Text style={{ color: Colors.foreground, fontSize: 20, fontWeight: '600' }}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Status chips */}
      {(data.partial || !data.isCurrentMonth) && (
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
          {data.partial && (
            <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: Colors.border }}>
              <Text style={{ fontSize: 10, color: Colors.muted }}>
                {data.isCurrentMonth ? 'Partial month' : 'Partial data'}
              </Text>
            </View>
          )}
          {!data.isCurrentMonth && (
            <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: Colors.border }}>
              <Text style={{ fontSize: 10, color: Colors.muted }}>Viewing past month — read only</Text>
            </View>
          )}
        </View>
      )}

      {/* KPIs */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <KPICard label="Balance" value={formatINR(data.net)} />
        <KPICard label="Income" value={formatINR(data.income)} accent={Colors.income} />
        <KPICard label="Expense" value={formatINR(data.expenses)} accent={Colors.expense} />
      </View>
      <Text style={{ fontSize: 12, color: Colors.muted, marginTop: -8, textAlign: 'center' }}>
        Savings rate: {data.savingsRate !== null ? `${data.savingsRate}%` : '—'}
      </Text>

      {!hasData ? (
        <View style={{ backgroundColor: Colors.surface, padding: 24, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' }}>
          <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 15, color: Colors.foreground, marginBottom: 4 }}>
            No transactions in {data.label}
          </Text>
          <Text style={{ fontSize: 12, color: Colors.muted, textAlign: 'center' }}>
            Pick another month, or import a statement to fill it in.
          </Text>
        </View>
      ) : (
        <>
          {/* Budget Ring */}
          <View style={{ backgroundColor: Colors.surface, padding: 24, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' }}>
            <View style={{
              width: 120, height: 120, borderRadius: 60, borderWidth: 10,
              borderColor: Colors.borderLight, justifyContent: 'center', alignItems: 'center',
            }}>
              <View style={{
                position: 'absolute', width: 120, height: 120, borderRadius: 60,
                borderWidth: 10, borderColor: ringColor,
                transform: [{ rotate: `${Math.min(360, budgetPct * 3.6 - 90)}deg` }],
                borderRightColor: 'transparent', borderBottomColor: 'transparent',
              }} />
              <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 28, fontWeight: '700', color: Colors.foreground }}>
                {budgetPct}%
              </Text>
            </View>
            <Text style={{ fontFamily: 'Roboto_900Black', fontSize: 10, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 1, marginTop: 12 }}>
              Budget Used — {data.shortLabel}
            </Text>
            <Text style={{ fontSize: 14, color: Colors.foreground, marginTop: 4 }}>
              {formatINR(data.expenses)} / {formatINR(data.monthlyBudget)}
            </Text>
          </View>

          {/* Spend Trend */}
          <View style={{ backgroundColor: Colors.surface, padding: 16, borderWidth: 1, borderColor: Colors.border }}>
            <Text style={{ fontFamily: 'Roboto_900Black', fontSize: 10, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>
              {data.isCurrentMonth ? '7-Day Spend Trend' : `Daily Spend — ${data.shortLabel}`}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <BarChart
                data={spendTrend}
                barWidth={data.isCurrentMonth ? 24 : 12}
                spacing={data.isCurrentMonth ? 14 : 7}
                roundedTop
                hideRules
                xAxisThickness={0}
                yAxisThickness={0}
                yAxisTextStyle={{ color: Colors.muted, fontSize: 10 }}
                xAxisLabelTextStyle={{ color: Colors.muted, fontSize: 10 }}
                noOfSections={3}
                maxValue={trendMax}
                height={140}
                isAnimated
                frontColor={Colors.primary}
                barBorderRadius={4}
              />
            </ScrollView>
          </View>

          {/* Top Categories */}
          {topCategories.length > 0 && (
            <View style={{ backgroundColor: Colors.surface, padding: 16, borderWidth: 1, borderColor: Colors.border }}>
              <Text style={{ fontFamily: 'Roboto_900Black', fontSize: 10, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>
                Top Categories — {data.shortLabel}
              </Text>
              <BarChart
                data={topCategories}
                barWidth={24}
                spacing={14}
                roundedTop
                hideRules
                xAxisThickness={0}
                yAxisThickness={0}
                yAxisTextStyle={{ color: Colors.muted, fontSize: 10 }}
                xAxisLabelTextStyle={{ color: Colors.muted, fontSize: 10 }}
                noOfSections={3}
                maxValue={catMax}
                height={140}
                isAnimated
                barBorderRadius={4}
              />
            </View>
          )}

          {/* Subscriptions: active list this month, charged summary for past months */}
          {data.subscriptionsCharged ? (
            <View style={{ backgroundColor: Colors.surface, padding: 16, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' }}>
              <Text style={{ fontFamily: 'Roboto_900Black', fontSize: 10, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                Subscriptions — {data.shortLabel}
              </Text>
              <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 22, fontWeight: '700', color: Colors.foreground }}>
                {data.subscriptionsCharged.count}
              </Text>
              <Text style={{ fontSize: 11, color: Colors.muted, marginTop: 2 }}>subscriptions charged</Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: Colors.primary, marginTop: 6 }}>
                {formatINR(data.subscriptionsCharged.total)}
              </Text>
            </View>
          ) : topSubs.length > 0 ? (
            <View style={{ backgroundColor: Colors.surface, padding: 16, borderWidth: 1, borderColor: Colors.border }}>
              <Text style={{ fontFamily: 'Roboto_900Black', fontSize: 10, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
                Top Subscriptions
              </Text>
              {topSubs.map((sub, i) => (
                <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: i < topSubs.length - 1 ? 1 : 0, borderBottomColor: Colors.border }}>
                  <Text style={{ color: Colors.foreground, fontSize: 14, textTransform: 'capitalize' }}>{sub.merchant_normalized}</Text>
                  <Text style={{ color: Colors.primary, fontSize: 14, fontWeight: '600' }}>{formatINR(Number(sub.avg_amount))}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* Upcoming Bills (current month only — server returns none for past months) */}
          {data.upcomingBills.length > 0 && (
            <View style={{ backgroundColor: Colors.surface, padding: 16, borderWidth: 1, borderColor: Colors.border }}>
              <Text style={{ fontFamily: 'Roboto_900Black', fontSize: 10, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
                Upcoming Bills
              </Text>
              {data.upcomingBills.map((bill, i) => (
                <View key={bill.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: i < data.upcomingBills.length - 1 ? 1 : 0, borderBottomColor: Colors.border }}>
                  <Text style={{ color: Colors.foreground, fontSize: 14 }}>{bill.name}</Text>
                  <Text style={{ color: Colors.muted, fontSize: 13 }}>
                    {bill.amount_estimate ? formatINR(bill.amount_estimate) + ' · ' : ''}
                    {new Date(bill.next_due_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </>
      )}

      {/* Trends: income vs expenses, tap a row to jump to that month */}
      {trends && trends.months.length > 1 && (
        <View style={{ backgroundColor: Colors.surface, padding: 16, borderWidth: 1, borderColor: Colors.border }}>
          <Text style={{ fontFamily: 'Roboto_900Black', fontSize: 10, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
            Trends — Income vs Expenses
          </Text>
          <View style={{ flexDirection: 'row', gap: 14, marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <View style={{ width: 9, height: 9, backgroundColor: Colors.income }} />
              <Text style={{ fontSize: 11, color: Colors.muted }}>Income</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <View style={{ width: 9, height: 9, backgroundColor: Colors.expense }} />
              <Text style={{ fontSize: 11, color: Colors.muted }}>Expenses</Text>
            </View>
          </View>
          {trends.months.map(m => {
            const active = m.month === month
            return (
              <TouchableOpacity
                key={m.month}
                onPress={() => goMonth(m.month)}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 8,
                  paddingVertical: 6, paddingHorizontal: active ? 6 : 0,
                  backgroundColor: active ? 'rgba(204,213,174,0.1)' : 'transparent',
                }}
              >
                <Text style={{ width: 34, fontSize: 11, color: active ? Colors.primary : Colors.muted, fontWeight: active ? '700' : '500' }}>
                  {monthLabel(m.month, false)}
                </Text>
                <View style={{ flex: 1, gap: 3 }}>
                  <View style={{ height: 8, backgroundColor: Colors.borderLight }}>
                    <View style={{ width: `${Math.round((m.income / trendMaxAll) * 100)}%`, height: 8, backgroundColor: Colors.income }} />
                  </View>
                  <View style={{ height: 8, backgroundColor: Colors.borderLight }}>
                    <View style={{ width: `${Math.round((m.expenses / trendMaxAll) * 100)}%`, height: 8, backgroundColor: Colors.expense }} />
                  </View>
                </View>
                <Text style={{ width: 52, fontSize: 11, color: Colors.muted, textAlign: 'right' }}>
                  {m.savingsRate !== null ? `${m.savingsRate}%` : '—'}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>
      )}
    </ScrollView>
  )
}
