import React, { useState, useEffect, useCallback } from 'react'
import { View, Text, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, TextInput, Modal, KeyboardAvoidingView, Platform, Alert } from 'react-native'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { api } from '../../lib/api'
import { Colors, BorderRadius } from '../../constants/theme'

function formatINR(n: number) {
  return '\u20B9' + Math.round(n).toLocaleString('en-IN')
}

export default function BillsScreen() {
  const { session } = useAuth()
  const [refreshing, setRefreshing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [bills, setBills] = useState<any[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [busy, setBusy] = useState(false)

  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [dayOfMonth, setDayOfMonth] = useState('1')

  const fetchData = useCallback(async () => {
    if (!session) return
    const { data } = await supabase.from('bills').select('*')
      .eq('user_id', session.user.id).order('next_due_at', { ascending: true })
    setBills(data || [])
    setLoading(false)
  }, [session])

  useEffect(() => { fetchData() }, [fetchData])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchData()
    setRefreshing(false)
  }, [fetchData])

  const handleAdd = async () => {
    if (!name || !session) return
    setBusy(true)
    try {
      await api.createBill({
        name,
        amountEstimate: amount ? parseFloat(amount) : null,
        dueRule: { recurrence: 'monthly', day_of_month: parseInt(dayOfMonth) || 1 },
        reminderLeadDays: 3,
      })
      setShowAdd(false)
      setName('')
      setAmount('')
      setDayOfMonth('1')
      await fetchData()
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setBusy(false)
    }
  }

  const handlePay = async (bill: any) => {
    Alert.alert(
      `Mark "${bill.name}" as paid?`,
      `Amount: ${bill.amount_estimate ? formatINR(bill.amount_estimate) : 'N/A'}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Paid',
          onPress: async () => {
            setBusy(true)
            try {
              const result = await api.payBill(bill.id)
              Alert.alert('Done', result.message)
              await fetchData()
            } catch (e: any) {
              Alert.alert('Error', e.message)
            } finally {
              setBusy(false)
            }
          }
        },
      ]
    )
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
          Bills
        </Text>
        <TouchableOpacity onPress={() => setShowAdd(true)}
          style={{ backgroundColor: Colors.primary, borderRadius: BorderRadius.button, paddingHorizontal: 14, paddingVertical: 10 }}>
          <Text style={{ color: '#000', fontSize: 12, fontWeight: '600' }}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={bills}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingTop: 0, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        renderItem={({ item }) => {
          const dueDate = new Date(item.next_due_at)
          const now = new Date()
          const daysUntil = Math.ceil((dueDate.getTime() - now.getTime()) / 86400000)
          const isOverdue = daysUntil < 0
          const isSoon = daysUntil >= 0 && daysUntil <= (item.reminder_lead_days || 3)

          return (
            <View style={{ backgroundColor: Colors.surface, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: isOverdue ? Colors.danger : isSoon ? Colors.warning : Colors.border }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: Colors.foreground, fontSize: 15, fontWeight: '600' }}>{item.name}</Text>
                  <Text style={{ color: isOverdue ? Colors.danger : isSoon ? Colors.warning : Colors.muted, fontSize: 12, marginTop: 4 }}>
                    {item.amount_estimate ? formatINR(item.amount_estimate) + ' · ' : ''}
                    Due {dueDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    {isOverdue ? ' · Overdue' : isSoon ? ` · ${daysUntil}d left` : ''}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => handlePay(item)}
                  style={{ backgroundColor: 'rgba(16,185,129,0.15)', borderRadius: BorderRadius.button, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)' }}>
                  <Text style={{ color: Colors.success, fontSize: 12, fontWeight: '600' }}>Mark Paid</Text>
                </TouchableOpacity>
              </View>
            </View>
          )
        }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', padding: 40 }}>
            <Text style={{ color: Colors.muted, fontSize: 14 }}>No bills set up yet.</Text>
          </View>
        }
      />

      {/* Add Modal */}
      <Modal visible={showAdd} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: Colors.surface, borderTopLeftRadius: BorderRadius.modal, borderTopRightRadius: BorderRadius.modal, padding: 24, paddingBottom: 40 }}>
            <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 20, color: Colors.foreground, fontWeight: '700', marginBottom: 20 }}>
              Add Bill
            </Text>

            <Text style={{ fontFamily: 'Roboto_900Black', fontSize: 10, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Name</Text>
            <TextInput value={name} onChangeText={setName} placeholder="e.g. Electricity" placeholderTextColor={Colors.mutedDark}
              style={{ backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.borderLight, borderRadius: BorderRadius.input, padding: 14, color: Colors.foreground, fontSize: 15, marginBottom: 16 }} />

            <Text style={{ fontFamily: 'Roboto_900Black', fontSize: 10, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Amount (optional)</Text>
            <TextInput value={amount} onChangeText={setAmount} placeholder="e.g. 2000" placeholderTextColor={Colors.mutedDark} keyboardType="numeric"
              style={{ backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.borderLight, borderRadius: BorderRadius.input, padding: 14, color: Colors.foreground, fontSize: 15, marginBottom: 16 }} />

            <Text style={{ fontFamily: 'Roboto_900Black', fontSize: 10, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Day of Month</Text>
            <TextInput value={dayOfMonth} onChangeText={setDayOfMonth} placeholder="1-31" placeholderTextColor={Colors.mutedDark} keyboardType="numeric" maxLength={2}
              style={{ backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.borderLight, borderRadius: BorderRadius.input, padding: 14, color: Colors.foreground, fontSize: 15, marginBottom: 20 }} />

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity onPress={() => setShowAdd(false)}
                style={{ flex: 1, padding: 14, borderRadius: BorderRadius.button, alignItems: 'center', borderWidth: 1, borderColor: Colors.borderLight }}>
                <Text style={{ color: Colors.muted, fontWeight: '500' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleAdd} disabled={busy}
                style={{ flex: 2, padding: 14, borderRadius: BorderRadius.button, alignItems: 'center', backgroundColor: Colors.primary, opacity: busy ? 0.5 : 1 }}>
                <Text style={{ color: '#000', fontWeight: '600' }}>{busy ? 'Adding...' : 'Add Bill'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}
