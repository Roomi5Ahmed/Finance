import React, { useState, useEffect, useCallback } from 'react'
import { View, Text, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { api } from '../../lib/api'
import { Colors, BorderRadius } from '../../constants/theme'

function formatINR(n: number) {
  return '\u20B9' + Math.round(n).toLocaleString('en-IN')
}

interface CategoryCard {
  id: string
  name: string
  icon: string
  color: string
  totalSpent: number
  transactionCount: number
  avgTransactionSize: number
  budgetPercentage: number
  tips: string[]
  tipsLoading: boolean
}

export default function InsightsScreen() {
  const { session } = useAuth()
  const [refreshing, setRefreshing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [cards, setCards] = useState<CategoryCard[]>([])

  const fetchData = useCallback(async () => {
    if (!session) return
    const uid = session.user.id
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    const [catsRes, txRes, lastTxRes, budgetRes] = await Promise.all([
      supabase.from('categories').select('*').order('name'),
      supabase.from('transactions').select('amount, category_id, merchant').eq('user_id', uid).gte('date', monthStart).lt('amount', 0),
      supabase.from('transactions').select('amount, category_id').eq('user_id', uid).gte('date', lastMonthStart).lt('date', lastMonthEnd).lt('amount', 0),
      supabase.from('budgets').select('amount, category_id').eq('user_id', uid).eq('period', 'monthly'),
    ])

    const categories = catsRes.data || []
    const txs = txRes.data || []
    const lastTxs = lastTxRes.data || []
    const budgets = budgetRes.data || []

    const budgetMap = new Map(budgets.map((b: any) => [b.category_id || 'overall', b.amount]))

    const newCards: CategoryCard[] = []

    for (const cat of categories) {
      const catTxs = txs.filter((t: any) => t.category_id === cat.id)
      if (catTxs.length === 0) continue

      const totalSpent = catTxs.reduce((s: number, t: any) => s + Math.abs(t.amount), 0)
      const lastMonthSpent = lastTxs.filter((t: any) => t.category_id === cat.id).reduce((s: number, t: any) => s + Math.abs(t.amount), 0)
      const momChange = lastMonthSpent > 0 ? Math.round(((totalSpent - lastMonthSpent) / lastMonthSpent) * 100) : null

      // Top merchants
      const merchantMap = new Map<string, number>()
      for (const t of catTxs) {
        const m = t.merchant || 'Unknown'
        merchantMap.set(m, (merchantMap.get(m) || 0) + Math.abs(t.amount))
      }
      const merchantSpend = Array.from(merchantMap.entries())
        .map(([name, spend]) => ({ name, spend }))
        .sort((a, b) => b.spend - a.spend)
        .slice(0, 5)

      const budget = budgetMap.get(cat.id) || 0
      const budgetPercentage = budget > 0 ? Math.round((totalSpent / budget) * 100) : 0

      newCards.push({
        id: cat.id,
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        totalSpent,
        transactionCount: catTxs.length,
        avgTransactionSize: Math.round(totalSpent / catTxs.length),
        budgetPercentage,
        tips: [],
        tipsLoading: false,
      })
    }

    setCards(newCards.sort((a, b) => b.totalSpent - a.totalSpent))
    setLoading(false)
  }, [session])

  useEffect(() => { fetchData() }, [fetchData])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchData()
    setRefreshing(false)
  }, [fetchData])

  const generateTips = async (card: CategoryCard) => {
    setCards(prev => prev.map(c => c.id === card.id ? { ...c, tipsLoading: true } : c))
    try {
      // Build full context for the API
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const { data: txs } = await supabase.from('transactions')
        .select('amount, merchant').eq('user_id', session!.user.id)
        .eq('category_id', card.id).gte('date', monthStart).lt('amount', 0)

      const merchantMap = new Map<string, number>()
      for (const t of txs || []) {
        const m = t.merchant || 'Unknown'
        merchantMap.set(m, (merchantMap.get(m) || 0) + Math.abs(t.amount))
      }
      const merchantSpend = Array.from(merchantMap.entries())
        .map(([name, spend]) => ({ name, spend }))
        .sort((a, b) => b.spend - a.spend)

      const result = await api.getInsights({
        name: card.name,
        totalSpent: card.totalSpent,
        budgetPercentage: card.budgetPercentage,
        transactionCount: card.transactionCount,
        avgTransactionSize: card.avgTransactionSize,
        momChange: null,
        lastMonthSpent: 0,
        merchantSpend,
        monthlyBudget: 0,
      })

      setCards(prev => prev.map(c => c.id === card.id ? { ...c, tips: result.tips, tipsLoading: false } : c))
    } catch (e: any) {
      setCards(prev => prev.map(c => c.id === card.id ? { ...c, tips: [e.message], tipsLoading: false } : c))
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
    <FlatList
      style={{ flex: 1, backgroundColor: Colors.background }}
      data={cards}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      ListHeaderComponent={
        <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 26, color: Colors.foreground, fontWeight: '700', marginBottom: 16 }}>
          Insights
        </Text>
      }
      renderItem={({ item }) => (
        <View style={{ backgroundColor: Colors.surface, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.border }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 28, marginRight: 12 }}>{item.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 16, color: Colors.foreground, fontWeight: '700' }}>{item.name}</Text>
              <Text style={{ color: Colors.muted, fontSize: 12, marginTop: 2 }}>
                {formatINR(item.totalSpent)} · {item.transactionCount} txns · avg {formatINR(item.avgTransactionSize)}
              </Text>
            </View>
          </View>

          {/* Tips */}
          {item.tips.length > 0 && (
            <View style={{ marginBottom: 12, gap: 8 }}>
              {item.tips.map((tip, i) => (
                <View key={i} style={{ backgroundColor: 'rgba(204,213,174,0.06)', padding: 12, borderRadius: BorderRadius.badge, borderLeftWidth: 2, borderLeftColor: Colors.primary }}>
                  <Text style={{ color: Colors.foreground, fontSize: 13, lineHeight: 18 }}>{tip}</Text>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity onPress={() => generateTips(item)} disabled={item.tipsLoading}
            style={{ backgroundColor: item.tips.length > 0 ? 'transparent' : 'rgba(204,213,174,0.1)', borderRadius: BorderRadius.button, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: Colors.primary, opacity: item.tipsLoading ? 0.5 : 1 }}>
            <Text style={{ color: Colors.primary, fontSize: 12, fontWeight: '600' }}>
              {item.tipsLoading ? 'Generating...' : item.tips.length > 0 ? 'Refresh Tips' : 'Generate AI Tips'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
      ListEmptyComponent={
        <View style={{ alignItems: 'center', padding: 40 }}>
          <Text style={{ color: Colors.muted, fontSize: 14 }}>Add categorized transactions to see insights.</Text>
        </View>
      }
    />
  )
}
