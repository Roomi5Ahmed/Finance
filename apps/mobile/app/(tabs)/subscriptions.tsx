import React, { useState, useEffect, useCallback } from 'react'
import { View, Text, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, Alert, AlertButton } from 'react-native'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { api } from '../../lib/api'
import { Colors, BorderRadius } from '../../constants/theme'
import { hapticSuccess, hapticError, hapticTap } from '../../lib/haptics'

function formatINR(n: number) {
  return '\u20B9' + Math.round(n).toLocaleString('en-IN')
}

export default function SubscriptionsScreen() {
  const { session } = useAuth()
  const [refreshing, setRefreshing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [subs, setSubs] = useState<any[]>([])
  const [busy, setBusy] = useState(false)

  const fetchData = useCallback(async () => {
    if (!session) return
    const { data } = await supabase.from('subscriptions').select('*, categories(name, icon, color)')
      .eq('user_id', session.user.id).order('avg_amount', { ascending: false })
    setSubs(data || [])
    setLoading(false)
  }, [session])

  useEffect(() => { fetchData() }, [fetchData])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchData()
    setRefreshing(false)
  }, [fetchData])

  const handleScan = async () => {
    setBusy(true)
    hapticTap()
    try {
      const result = await api.scanSubscriptions()
      hapticSuccess()
      Alert.alert('Scan Complete', result.message)
      await fetchData()
    } catch (e: any) {
      hapticError()
      Alert.alert('Scan Failed', e.message)
    } finally {
      setBusy(false)
    }
  }

  const handleAction = (sub: any) => {
    const buttons: AlertButton[] = [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Mark Cancelled', onPress: () => updateStatus(sub.id, 'cancelled_by_user') },
      { text: 'Not Recurring', onPress: () => updateStatus(sub.id, 'not_recurring') },
      { text: 'Delete', style: 'destructive', onPress: () => deleteSub(sub.id) },
    ]
    if (sub.status === 'candidate') {
      buttons.splice(1, 0, { text: 'Confirm', onPress: () => updateStatus(sub.id, 'active') })
    }
    Alert.alert(sub.merchant_normalized, `₹${sub.avg_amount}/${sub.cadence}`, buttons)
  }

  const updateStatus = async (id: string, status: string) => {
    try {
      await api.updateSubscription(id, { status })
      await fetchData()
    } catch (e: any) {
      Alert.alert('Error', e.message)
    }
  }

  const deleteSub = async (id: string) => {
    try {
      await api.updateSubscription(id, { status: 'delete' })
      await fetchData()
    } catch (e: any) {
      Alert.alert('Error', e.message)
    }
  }

  const activeSubs = subs.filter(s => s.status === 'active' || s.status === 'candidate')
  const monthlyTotal = activeSubs.reduce((sum, s) => {
    const amt = Number(s.avg_amount) || 0
    switch (s.cadence) {
      case 'weekly': return sum + amt * 4.33
      case 'quarterly': return sum + amt / 3
      case 'annual': return sum + amt / 12
      default: return sum + amt
    }
  }, 0)

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <View style={{ padding: 16, paddingBottom: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 26, color: Colors.foreground, fontWeight: '700' }}>
            Subscriptions
          </Text>
          <TouchableOpacity onPress={handleScan} disabled={busy}
            style={{ backgroundColor: Colors.primary, borderRadius: BorderRadius.button, paddingHorizontal: 14, paddingVertical: 10, opacity: busy ? 0.5 : 1 }}>
            <Text style={{ color: '#01472e', fontSize: 12, fontWeight: '600' }}>{busy ? 'Scanning...' : 'Scan'}</Text>
          </TouchableOpacity>
        </View>

        {/* Monthly + Annual total */}
        <View style={{ backgroundColor: Colors.surface, padding: 16, borderWidth: 1, borderColor: Colors.border }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontFamily: 'Roboto_900Black', fontSize: 10, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 1 }}>
              Monthly Cost
            </Text>
            <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 20, color: Colors.primary, fontWeight: '700' }}>
              {formatINR(monthlyTotal)}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.border }}>
            <Text style={{ fontFamily: 'Roboto_900Black', fontSize: 10, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 1 }}>
              Annual Cost
            </Text>
            <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 16, color: Colors.foreground, fontWeight: '700' }}>
              {formatINR(monthlyTotal * 12)}
            </Text>
          </View>
        </View>
      </View>

      <FlatList
        data={subs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingTop: 0, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => handleAction(item)}
            style={{ backgroundColor: Colors.surface, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: Colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: Colors.foreground, fontSize: 14, fontWeight: '600', textTransform: 'capitalize' }}>
                {item.merchant_normalized}
              </Text>
              <Text style={{ color: Colors.muted, fontSize: 12, marginTop: 3 }}>
                {formatINR(item.avg_amount)}/{item.cadence?.replace('ly', '')} · {item.categories?.name || 'Uncategorized'}
              </Text>
            </View>
            {item.status === 'candidate' && (
              <View style={{ backgroundColor: 'rgba(251,191,36,0.15)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.badge }}>
                <Text style={{ fontSize: 10, color: Colors.warning }}>Candidate</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', padding: 40 }}>
            <Text style={{ color: Colors.muted, fontSize: 14 }}>No subscriptions found. Tap Scan to detect from transactions.</Text>
          </View>
        }
      />
    </View>
  )
}
