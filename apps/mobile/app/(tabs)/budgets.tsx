import React, { useState, useEffect, useCallback } from 'react'
import { View, Text, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, TextInput, Modal, KeyboardAvoidingView, Platform, Alert } from 'react-native'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { api } from '../../lib/api'
import { Colors, BorderRadius } from '../../constants/theme'
import { hapticSuccess, hapticError, hapticTap } from '../../lib/haptics'

function formatINR(n: number) {
  return '\u20B9' + Math.round(n).toLocaleString('en-IN')
}

export default function BudgetsScreen() {
  const { session } = useAuth()
  const [refreshing, setRefreshing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [budgets, setBudgets] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [busy, setBusy] = useState(false)

  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [period, setPeriod] = useState('monthly')
  const [monthOffset, setMonthOffset] = useState(0) // 0 = current, -1 = last month

  const viewDate = new Date()
  viewDate.setDate(1)
  viewDate.setMonth(viewDate.getMonth() + monthOffset)
  const viewLabel = viewDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })

  const fetchData = useCallback(async () => {
    if (!session) return
    const [budgetRes, catRes] = await Promise.all([
      supabase.from('budgets').select('*, categories(name, icon, color)').eq('user_id', session.user.id).order('created_at', { ascending: false }),
      supabase.from('categories').select('*').order('name'),
    ])

    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() + monthOffset)
    const monthStart = new Date(d.getFullYear(), d.getMonth(), 1).toISOString()
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999).toISOString()

    const withProgress = await Promise.all((budgetRes.data || []).map(async (b: any) => {
      let q = supabase.from('transactions').select('amount').eq('user_id', session.user.id).gte('date', monthStart).lte('date', monthEnd).lt('amount', 0)
      if (b.category_id) q = q.eq('category_id', b.category_id)
      const { data: txs } = await q
      const spent = (txs || []).reduce((s: number, t: any) => s + Math.abs(t.amount), 0)
      const pct = b.amount > 0 ? Math.min(100, Math.round((spent / b.amount) * 100)) : 0
      return { ...b, spent, pct, remaining: Math.max(0, b.amount - spent) }
    }))

    setBudgets(withProgress)
    setCategories(catRes.data || [])
    setLoading(false)
  }, [session, monthOffset])

  useEffect(() => { fetchData() }, [fetchData])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchData()
    setRefreshing(false)
  }, [fetchData])

  const handleAdd = async () => {
    if (!amount || !session) return
    setBusy(true)
    hapticTap()
    try {
      await api.createBudget({
        categoryId: categoryId || null,
        amount: parseFloat(amount),
        period,
        autoRenew: true,
        alertThresholds: [80, 100],
      })
      hapticSuccess()
      setShowAdd(false)
      setAmount('')
      setCategoryId('')
      await fetchData()
    } catch (e: any) {
      hapticError()
      Alert.alert('Error', e.message)
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <View style={{ padding: 16, paddingBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 26, color: Colors.foreground, fontWeight: '700' }}>
          Budgets
        </Text>
        <TouchableOpacity onPress={() => setShowAdd(true)}
          style={{ backgroundColor: Colors.primary, borderRadius: BorderRadius.button, paddingHorizontal: 14, paddingVertical: 10 }}>
          <Text style={{ color: '#01472e', fontSize: 12, fontWeight: '600' }}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Month navigation */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 16, marginBottom: 12, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.button, overflow: 'hidden' }}>
        <TouchableOpacity onPress={() => setMonthOffset(o => o - 1)}
          style={{ padding: 12, borderRightWidth: 1, borderRightColor: Colors.border, minWidth: 48, alignItems: 'center' }}>
          <Text style={{ color: Colors.primary, fontSize: 16 }}>‹</Text>
        </TouchableOpacity>
        <Text style={{ color: Colors.foreground, fontSize: 14, fontWeight: '600' }}>{viewLabel}</Text>
        <TouchableOpacity onPress={() => setMonthOffset(o => Math.min(0, o + 1))} disabled={monthOffset >= 0}
          style={{ padding: 12, borderLeftWidth: 1, borderLeftColor: Colors.border, minWidth: 48, alignItems: 'center', opacity: monthOffset >= 0 ? 0.3 : 1 }}>
          <Text style={{ color: Colors.primary, fontSize: 16 }}>›</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={budgets}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingTop: 0, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        renderItem={({ item }) => {
          const barColor = item.pct >= 100 ? Colors.danger : item.pct >= 80 ? Colors.warning : Colors.foreground
          return (
            <View style={{ backgroundColor: Colors.surface, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.border }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <View>
                  <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 15, color: Colors.foreground, fontWeight: '700' }}>
                    {item.categories ? `${item.categories.icon} ${item.categories.name}` : 'Overall Budget'}
                  </Text>
                  <Text style={{ fontSize: 12, color: Colors.muted, marginTop: 2 }}>
                    {item.period === 'monthly' ? 'Monthly' : 'Weekly'}
                  </Text>
                </View>
                <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 18, color: barColor, fontWeight: '700' }}>
                  {item.pct}%
                </Text>
              </View>

              {/* Progress bar */}
              <View style={{ height: 8, backgroundColor: Colors.borderLight, borderRadius: 4, overflow: 'hidden' }}>
                <View style={{ height: 8, backgroundColor: barColor, borderRadius: 4, width: `${item.pct}%` }} />
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                <Text style={{ fontSize: 12, color: Colors.muted }}>{formatINR(item.spent)} spent</Text>
                <Text style={{ fontSize: 12, color: Colors.muted }}>of {formatINR(item.amount)}</Text>
              </View>
            </View>
          )
        }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', padding: 40 }}>
            <Text style={{ color: Colors.muted, fontSize: 14 }}>No budgets yet. Add one to start tracking.</Text>
          </View>
        }
      />

      {/* Add Modal */}
      <Modal visible={showAdd} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: Colors.surface, borderTopLeftRadius: BorderRadius.modal, borderTopRightRadius: BorderRadius.modal, padding: 24, paddingBottom: 40 }}>
            <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 20, color: Colors.foreground, fontWeight: '700', marginBottom: 20 }}>
              Create Budget
            </Text>

            <Text style={{ fontFamily: 'Roboto_900Black', fontSize: 10, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
              Amount
            </Text>
            <TextInput value={amount} onChangeText={setAmount} placeholder="e.g. 5000" placeholderTextColor={Colors.mutedDark} keyboardType="numeric"
              style={{ backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.borderLight, borderRadius: BorderRadius.input, padding: 14, color: Colors.foreground, fontSize: 15, marginBottom: 16 }} />

            <Text style={{ fontFamily: 'Roboto_900Black', fontSize: 10, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
              Category
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
              <TouchableOpacity onPress={() => setCategoryId('')}
                style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: BorderRadius.badge, borderWidth: 1, borderColor: !categoryId ? Colors.primary : Colors.borderLight }}>
                <Text style={{ fontSize: 11, color: !categoryId ? Colors.primary : Colors.muted }}>Overall</Text>
              </TouchableOpacity>
              {categories.map(c => (
                <TouchableOpacity key={c.id} onPress={() => setCategoryId(c.id)}
                  style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: BorderRadius.badge, borderWidth: 1, borderColor: categoryId === c.id ? Colors.primary : Colors.borderLight }}>
                  <Text style={{ fontSize: 11, color: categoryId === c.id ? Colors.primary : Colors.muted }}>{c.icon} {c.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={{ fontFamily: 'Roboto_900Black', fontSize: 10, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
              Period
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
              {['monthly', 'weekly'].map(p => (
                <TouchableOpacity key={p} onPress={() => setPeriod(p)}
                  style={{ flex: 1, padding: 12, borderRadius: BorderRadius.button, alignItems: 'center', borderWidth: 1, borderColor: period === p ? Colors.primary : Colors.borderLight, backgroundColor: period === p ? 'rgba(204,213,174,0.1)' : 'transparent' }}>
                  <Text style={{ color: period === p ? Colors.primary : Colors.muted, fontWeight: '600', textTransform: 'capitalize' }}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity onPress={() => setShowAdd(false)}
                style={{ flex: 1, padding: 14, borderRadius: BorderRadius.button, alignItems: 'center', borderWidth: 1, borderColor: Colors.borderLight }}>
                <Text style={{ color: Colors.muted, fontWeight: '500' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleAdd} disabled={busy}
                style={{ flex: 2, padding: 14, borderRadius: BorderRadius.button, alignItems: 'center', backgroundColor: Colors.primary, opacity: busy ? 0.5 : 1 }}>
                <Text style={{ color: '#01472e', fontWeight: '600' }}>{busy ? 'Creating...' : 'Create Budget'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}
