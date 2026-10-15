import React, { useState, useEffect, useCallback } from 'react'
import { View, Text, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity, Alert } from 'react-native'
import { BarChart } from 'react-native-gifted-charts'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { Colors } from '../../constants/theme'

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

export default function DashboardScreen() {
  const { session, signOut } = useAuth()
  const [refreshing, setRefreshing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [totalBalance, setTotalBalance] = useState(0)
  const [totalIncome, setTotalIncome] = useState(0)
  const [totalExpense, setTotalExpense] = useState(0)
  const [budgetPct, setBudgetPct] = useState(0)
  const [budgetAmount, setBudgetAmount] = useState(0)
  const [budgetSpent, setBudgetSpent] = useState(0)
  const [topSubs, setTopSubs] = useState<any[]>([])
  const [upcomingBills, setUpcomingBills] = useState<any[]>([])
  const [spendTrend, setSpendTrend] = useState<{ value: number; label: string; frontColor: string }[]>([])
  const [topCategories, setTopCategories] = useState<{ value: number; label: string; frontColor: string }[]>([])

  const fetchData = useCallback(async () => {
    if (!session) return
    const uid = session.user.id
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    const [txRes, profileRes, subsRes, billsRes] = await Promise.all([
      supabase.from('transactions').select('*, categories(name, icon, color)').eq('user_id', uid).order('date', { ascending: false }),
      supabase.from('user_profiles').select('monthly_budget, monthly_income').eq('id', uid).single(),
      supabase.from('subscriptions').select('merchant_normalized, avg_amount, cadence').eq('user_id', uid).eq('status', 'active').order('avg_amount', { ascending: false }).limit(3),
      supabase.from('bills').select('name, amount_estimate, next_due_at').eq('user_id', uid).eq('status', 'active').order('next_due_at', { ascending: true }).limit(3),
    ])

    const txs = txRes.data || []
    let income = 0
    let expense = 0
    for (const tx of txs) {
      if (tx.amount > 0) income += tx.amount
      else expense += Math.abs(tx.amount)
    }
    setTotalIncome(income)
    setTotalExpense(expense)
    setTotalBalance(income - expense)

    const monthlyBudget = profileRes.data?.monthly_budget || 50000
    const monthExpenses = txs.filter(tx => {
      const d = new Date(tx.date)
      return tx.amount < 0 && d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
    })
    const spent = monthExpenses.reduce((s, tx) => s + Math.abs(tx.amount), 0)
    setBudgetAmount(monthlyBudget)
    setBudgetSpent(spent)
    setBudgetPct(monthlyBudget > 0 ? Math.min(100, Math.round((spent / monthlyBudget) * 100)) : 0)

    // 7-day spend trend
    const days: { value: number; label: string; frontColor: string }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      d.setHours(0, 0, 0, 0)
      const dayEnd = new Date(d)
      dayEnd.setHours(23, 59, 59, 999)
      const daySpend = txs
        .filter(tx => {
          const txDate = new Date(tx.date)
          return tx.amount < 0 && txDate >= d && txDate <= dayEnd
        })
        .reduce((s, tx) => s + Math.abs(tx.amount), 0)
      days.push({ value: Math.round(daySpend), label: DAY_LABELS[d.getDay()], frontColor: Colors.primary })
    }
    setSpendTrend(days)

    // Top categories this month
    const catMap = new Map<string, number>()
    for (const tx of monthExpenses) {
      const name = tx.categories?.name || 'Other'
      catMap.set(name, (catMap.get(name) || 0) + Math.abs(tx.amount))
    }
    const sorted = [...catMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
    const catColors = [Colors.primary, '#A78BFA', '#60A5FA', '#34D399', '#FBBF24']
    setTopCategories(
      sorted.map(([name, value], i) => ({
        value: Math.round(value),
        label: name.length > 8 ? name.slice(0, 7) + '…' : name,
        frontColor: catColors[i % catColors.length],
      }))
    )

    setTopSubs(subsRes.data || [])
    setUpcomingBills(billsRes.data || [])
    setLoading(false)
  }, [session])

  useEffect(() => { fetchData() }, [fetchData])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchData()
    setRefreshing(false)
  }, [fetchData])

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    )
  }

  const ringColor = budgetPct >= 100 ? Colors.danger : budgetPct >= 80 ? Colors.warning : Colors.primary
  const trendMax = Math.max(...spendTrend.map(d => d.value), 100)
  const catMax = Math.max(...topCategories.map(c => c.value), 100)

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

      {/* KPIs */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <KPICard label="Balance" value={formatINR(totalBalance)} />
        <KPICard label="Income" value={formatINR(totalIncome)} accent={Colors.income} />
        <KPICard label="Expense" value={formatINR(totalExpense)} accent={Colors.expense} />
      </View>

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
          Monthly Budget Used
        </Text>
        <Text style={{ fontSize: 14, color: Colors.foreground, marginTop: 4 }}>
          {formatINR(budgetSpent)} / {formatINR(budgetAmount)}
        </Text>
      </View>

      {/* 7-Day Spend Trend */}
      <View style={{ backgroundColor: Colors.surface, padding: 16, borderWidth: 1, borderColor: Colors.border }}>
        <Text style={{ fontFamily: 'Roboto_900Black', fontSize: 10, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>
          7-Day Spend Trend
        </Text>
        <BarChart
          data={spendTrend}
          barWidth={24}
          spacing={14}
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
      </View>

      {/* Top Categories */}
      {topCategories.length > 0 && (
        <View style={{ backgroundColor: Colors.surface, padding: 16, borderWidth: 1, borderColor: Colors.border }}>
          <Text style={{ fontFamily: 'Roboto_900Black', fontSize: 10, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>
            Top Categories (This Month)
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

      {/* Top Subscriptions */}
      {topSubs.length > 0 && (
        <View style={{ backgroundColor: Colors.surface, padding: 16, borderWidth: 1, borderColor: Colors.border }}>
          <Text style={{ fontFamily: 'Roboto_900Black', fontSize: 10, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
            Top Subscriptions
          </Text>
          {topSubs.map((sub, i) => (
            <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: i < topSubs.length - 1 ? 1 : 0, borderBottomColor: Colors.border }}>
              <Text style={{ color: Colors.foreground, fontSize: 14, textTransform: 'capitalize' }}>{sub.merchant_normalized}</Text>
              <Text style={{ color: Colors.primary, fontSize: 14, fontWeight: '600' }}>{formatINR(sub.avg_amount)}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Upcoming Bills */}
      {upcomingBills.length > 0 && (
        <View style={{ backgroundColor: Colors.surface, padding: 16, borderWidth: 1, borderColor: Colors.border }}>
          <Text style={{ fontFamily: 'Roboto_900Black', fontSize: 10, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
            Upcoming Bills
          </Text>
          {upcomingBills.map((bill, i) => (
            <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: i < upcomingBills.length - 1 ? 1 : 0, borderBottomColor: Colors.border }}>
              <Text style={{ color: Colors.foreground, fontSize: 14 }}>{bill.name}</Text>
              <Text style={{ color: Colors.muted, fontSize: 13 }}>
                {bill.amount_estimate ? formatINR(bill.amount_estimate) + ' · ' : ''}
                {new Date(bill.next_due_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  )
}
