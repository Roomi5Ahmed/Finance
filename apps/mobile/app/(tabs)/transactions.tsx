import React, { useState, useEffect, useCallback } from 'react'
import { View, Text, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, TextInput, Alert, Modal, KeyboardAvoidingView, Platform } from 'react-native'
import * as DocumentPicker from 'expo-document-picker'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { api } from '../../lib/api'
import { Colors, BorderRadius } from '../../constants/theme'
import { hapticSuccess, hapticError, hapticTap } from '../../lib/haptics'

function formatINR(n: number) {
  return '\u20B9' + Math.round(n).toLocaleString('en-IN')
}

const PAGE_SIZE = 50

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
      else inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current.trim())
  return result
}

function parseCSVText(text: string, template: 'HDFC' | 'SBI') {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return []
  const headers = parseCSVLine(lines[0]).map(h => h.replace(/^"|"$/g, ''))
  const rows: any[] = []

  for (let i = 1; i < lines.length; i++) {
    const vals = parseCSVLine(lines[i])
    const row: Record<string, string> = {}
    headers.forEach((h, j) => { row[h] = (vals[j] || '').replace(/^"|"$/g, '') })

    let date = '', merchant = '', amount = 0
    if (template === 'HDFC') {
      date = row['Date'] || row['Value Date'] || ''
      merchant = row['Narration'] || row['Description'] || 'Unknown'
      const withdrawal = parseFloat(row['Withdrawal Amount'] || '0') || 0
      const deposit = parseFloat(row['Deposit Amount'] || '0') || 0
      amount = deposit > 0 ? deposit : -withdrawal
    } else {
      date = row['Txn Date'] || row['Date'] || ''
      merchant = row['Description'] || 'Unknown'
      const debit = parseFloat(row['Debit'] || '0') || 0
      const credit = parseFloat(row['Credit'] || '0') || 0
      amount = credit > 0 ? credit : -debit
    }

    if (!date || isNaN(amount) || amount === 0) continue
    const parts = date.split(/[-/]/)
    let parsedDate = new Date()
    if (parts.length === 3) {
      const [d, m, y] = parts
      const yr = y.length === 2 ? `20${y}` : y
      const candidate = new Date(`${yr}-${m}-${d}`)
      if (!isNaN(candidate.getTime())) parsedDate = candidate
    }

    rows.push({ date: parsedDate.toISOString(), merchant: merchant.substring(0, 255), amount, notes: 'Imported via CSV' })
  }
  return rows
}

export default function TransactionsScreen() {
  const { session } = useAuth()
  const [refreshing, setRefreshing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [busy, setBusy] = useState(false)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [showCsv, setShowCsv] = useState(false)
  const [csvTemplate, setCsvTemplate] = useState<'HDFC' | 'SBI'>('HDFC')
  const [csvFileName, setCsvFileName] = useState<string | null>(null)
  const [csvContent, setCsvContent] = useState<string | null>(null)

  const [merchant, setMerchant] = useState('')
  const [amount, setAmount] = useState('')
  const [type, setType] = useState<'expense' | 'income'>('expense')
  const [categoryId, setCategoryId] = useState('')

  const fetchData = useCallback(async () => {
    if (!session) return
    const [txRes, catRes] = await Promise.all([
      supabase.from('transactions').select('*, categories(name, icon, color)').eq('user_id', session.user.id).order('date', { ascending: false }).range(0, PAGE_SIZE - 1),
      supabase.from('categories').select('*').order('name'),
    ])
    setTransactions(txRes.data || [])
    setHasMore((txRes.data || []).length === PAGE_SIZE)
    setPage(0)
    setCategories(catRes.data || [])
    setLoading(false)
  }, [session])

  useEffect(() => { fetchData() }, [fetchData])

  const loadMore = useCallback(async () => {
    if (!session || loadingMore || !hasMore || search) return
    setLoadingMore(true)
    const nextPage = page + 1
    const { data } = await supabase.from('transactions').select('*, categories(name, icon, color)')
      .eq('user_id', session.user.id).order('date', { ascending: false })
      .range(nextPage * PAGE_SIZE, (nextPage + 1) * PAGE_SIZE - 1)
    if (data && data.length > 0) {
      setTransactions(prev => [...prev, ...data])
      setPage(nextPage)
    }
    if (!data || data.length < PAGE_SIZE) setHasMore(false)
    setLoadingMore(false)
  }, [session, page, hasMore, loadingMore, search])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchData()
    setRefreshing(false)
  }, [fetchData])

  const handleSyncBank = async () => {
    setBusy(true)
    hapticTap()
    try {
      const result = await api.syncBank()
      hapticSuccess()
      Alert.alert('Sync Complete', result.message)
      await fetchData()
    } catch (e: any) {
      hapticError()
      Alert.alert('Sync Failed', e.message)
    } finally {
      setBusy(false)
    }
  }

  const handleAutoCategorise = async () => {
    setBusy(true)
    hapticTap()
    try {
      const result = await api.categorise()
      hapticSuccess()
      Alert.alert('Done', result.message)
      await fetchData()
    } catch (e: any) {
      hapticError()
      Alert.alert('Error', e.message)
    } finally {
      setBusy(false)
    }
  }

  const pickCsvFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'text/csv', copyToCacheDirectory: true })
    if (result.canceled || !result.assets?.[0]) return
    const file = result.assets[0]
    setCsvFileName(file.name)
    try {
      const text = await fetch(file.uri).then(r => r.text())
      setCsvContent(text)
    } catch {
      Alert.alert('Error', 'Could not read the selected file.')
    }
  }

  const handleCsvImport = async () => {
    if (!csvContent || !session) return
    setBusy(true)
    hapticTap()
    try {
      const rows = parseCSVText(csvContent, csvTemplate)
      if (rows.length === 0) {
        hapticError()
        Alert.alert('No Transactions', 'Could not find valid transactions matching the selected template.')
        return
      }
      const accountId = await ensureAccount()
      const toInsert = rows.map(r => ({ ...r, user_id: session.user.id, account_id: accountId }))
      const { error } = await supabase.from('transactions').insert(toInsert)
      if (error) throw error
      hapticSuccess()
      Alert.alert('Success', `Imported ${rows.length} transactions.`)
      setShowCsv(false)
      setCsvContent(null)
      setCsvFileName(null)
      await fetchData()
    } catch (e: any) {
      hapticError()
      Alert.alert('Import Failed', e.message)
    } finally {
      setBusy(false)
    }
  }

  const handleAdd = async () => {
    if (!merchant || !amount || !session) return
    setBusy(true)
    try {
      const accountId = await ensureAccount()
      const amt = parseFloat(amount)
      const signedAmt = type === 'expense' ? -Math.abs(amt) : Math.abs(amt)

      const { error } = await supabase.from('transactions').insert({
        user_id: session.user.id,
        account_id: accountId,
        category_id: categoryId || null,
        amount: signedAmt,
        date: new Date().toISOString(),
        merchant,
        notes: '',
        tags: [],
      })

      if (error) throw error

      setShowAdd(false)
      setMerchant('')
      setAmount('')
      setCategoryId('')
      await fetchData()
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setBusy(false)
    }
  }

  const ensureAccount = async (): Promise<string> => {
    if (!session) throw new Error('No session')
    const { data } = await supabase.from('accounts').select('id').eq('user_id', session.user.id).limit(1).maybeSingle()
    if (data) return data.id
    const { data: newAcc } = await supabase.from('accounts').insert({ user_id: session.user.id, name: 'Main Account', type: 'BANK', balance: 0 }).select('id').single()
    return newAcc!.id
  }

  const filtered = search
    ? transactions.filter(tx =>
        tx.merchant?.toLowerCase().includes(search.toLowerCase()) ||
        tx.categories?.name?.toLowerCase().includes(search.toLowerCase())
      )
    : transactions

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
        <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 26, color: Colors.foreground, fontWeight: '700', marginBottom: 12 }}>
          Transactions
        </Text>

        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search transactions..."
          placeholderTextColor={Colors.mutedDark}
          style={{
            backgroundColor: Colors.surface,
            borderWidth: 1,
            borderColor: Colors.borderLight,
            borderRadius: BorderRadius.input,
            padding: 12,
            color: Colors.foreground,
            fontSize: 14,
            marginBottom: 12,
          }}
        />

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <TouchableOpacity onPress={handleSyncBank} disabled={busy}
            style={{ backgroundColor: 'rgba(16,185,129,0.15)', borderRadius: BorderRadius.button, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)' }}>
            <Text style={{ color: Colors.success, fontSize: 12, fontWeight: '600' }}>🏦 {busy ? '...' : 'Sync Bank'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleAutoCategorise} disabled={busy}
            style={{ backgroundColor: 'rgba(255,152,162,0.1)', borderRadius: BorderRadius.button, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: 'rgba(255,152,162,0.3)' }}>
            <Text style={{ color: Colors.primary, fontSize: 12, fontWeight: '600' }}>✨ {busy ? '...' : 'Auto Categorise'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowCsv(true)}
            style={{ backgroundColor: 'rgba(96,165,250,0.1)', borderRadius: BorderRadius.button, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: 'rgba(96,165,250,0.3)' }}>
            <Text style={{ color: '#60A5FA', fontSize: 12, fontWeight: '600' }}>📄 CSV</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowAdd(true)}
            style={{ backgroundColor: Colors.primary, borderRadius: BorderRadius.button, paddingHorizontal: 14, paddingVertical: 10 }}>
            <Text style={{ color: '#000', fontSize: 12, fontWeight: '600' }}>+ Add</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingTop: 0, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        onEndReachedThreshold={0.5}
        onEndReached={loadMore}
        ListFooterComponent={loadingMore ? (
          <View style={{ padding: 16, alignItems: 'center' }}>
            <ActivityIndicator size="small" color={Colors.primary} />
          </View>
        ) : null}
        renderItem={({ item }) => (
          <View style={{
            backgroundColor: Colors.surface, padding: 14, marginBottom: 8,
            borderWidth: 1, borderColor: Colors.border,
            flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={{ color: Colors.foreground, fontSize: 14, fontWeight: '500' }}>{item.merchant}</Text>
              <Text style={{ color: Colors.muted, fontSize: 11, marginTop: 3 }}>
                {item.categories?.icon} {item.categories?.name || 'Uncategorized'} · {new Date(item.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </Text>
            </View>
            <Text style={{ color: item.amount < 0 ? Colors.expense : Colors.income, fontSize: 14, fontWeight: '600' }}>
              {item.amount < 0 ? '-' : '+'}{formatINR(Math.abs(item.amount))}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', padding: 40 }}>
            <Text style={{ color: Colors.muted, fontSize: 14 }}>No transactions found.</Text>
          </View>
        }
      />

      {/* CSV Import Modal */}
      <Modal visible={showCsv} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: Colors.surface, borderTopLeftRadius: BorderRadius.modal, borderTopRightRadius: BorderRadius.modal, padding: 24, paddingBottom: 40 }}>
            <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 20, color: Colors.foreground, fontWeight: '700', marginBottom: 20 }}>
              Import CSV
            </Text>

            <Text style={{ fontFamily: 'Roboto_900Black', fontSize: 10, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
              Bank Template
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              {(['HDFC', 'SBI'] as const).map(t => (
                <TouchableOpacity key={t} onPress={() => setCsvTemplate(t)}
                  style={{ flex: 1, padding: 12, borderRadius: BorderRadius.button, alignItems: 'center', borderWidth: 1, borderColor: csvTemplate === t ? Colors.primary : Colors.borderLight, backgroundColor: csvTemplate === t ? 'rgba(255,152,162,0.1)' : 'transparent' }}>
                  <Text style={{ color: csvTemplate === t ? Colors.primary : Colors.muted, fontWeight: '600' }}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={{ fontFamily: 'Roboto_900Black', fontSize: 10, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
              Upload File
            </Text>
            <TouchableOpacity onPress={pickCsvFile}
              style={{ borderWidth: 2, borderStyle: 'dashed', borderColor: Colors.borderLight, borderRadius: 14, padding: 24, alignItems: 'center', marginBottom: 20, backgroundColor: Colors.background }}>
              <Text style={{ fontSize: 14, color: csvFileName ? Colors.primary : Colors.muted, fontWeight: csvFileName ? '600' : '400' }}>
                {csvFileName || 'Tap to select a CSV file'}
              </Text>
              <Text style={{ fontSize: 12, color: Colors.mutedDark, marginTop: 4 }}>CSV up to 10MB</Text>
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity onPress={() => { setShowCsv(false); setCsvContent(null); setCsvFileName(null) }}
                style={{ flex: 1, padding: 14, borderRadius: BorderRadius.button, alignItems: 'center', borderWidth: 1, borderColor: Colors.borderLight }}>
                <Text style={{ color: Colors.muted, fontWeight: '500' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleCsvImport} disabled={busy || !csvContent}
                style={{ flex: 2, padding: 14, borderRadius: BorderRadius.button, alignItems: 'center', backgroundColor: Colors.primary, opacity: busy || !csvContent ? 0.5 : 1 }}>
                <Text style={{ color: '#000', fontWeight: '600' }}>{busy ? 'Importing...' : 'Import'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add Modal */}
      <Modal visible={showAdd} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: Colors.surface, borderTopLeftRadius: BorderRadius.modal, borderTopRightRadius: BorderRadius.modal, padding: 24, paddingBottom: 40 }}>
            <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 20, color: Colors.foreground, fontWeight: '700', marginBottom: 20 }}>
              Add Transaction
            </Text>

            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              <TouchableOpacity onPress={() => setType('expense')}
                style={{ flex: 1, padding: 12, borderRadius: BorderRadius.button, alignItems: 'center', borderWidth: 1, borderColor: type === 'expense' ? Colors.expense : Colors.borderLight, backgroundColor: type === 'expense' ? 'rgba(255,152,162,0.1)' : 'transparent' }}>
                <Text style={{ color: type === 'expense' ? Colors.expense : Colors.muted, fontWeight: '600' }}>Expense</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setType('income')}
                style={{ flex: 1, padding: 12, borderRadius: BorderRadius.button, alignItems: 'center', borderWidth: 1, borderColor: type === 'income' ? Colors.income : Colors.borderLight, backgroundColor: type === 'income' ? 'rgba(16,185,129,0.1)' : 'transparent' }}>
                <Text style={{ color: type === 'income' ? Colors.income : Colors.muted, fontWeight: '600' }}>Income</Text>
              </TouchableOpacity>
            </View>

            <TextInput value={merchant} onChangeText={setMerchant} placeholder="Merchant" placeholderTextColor={Colors.mutedDark}
              style={{ backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.borderLight, borderRadius: BorderRadius.input, padding: 14, color: Colors.foreground, fontSize: 15, marginBottom: 12 }} />

            <TextInput value={amount} onChangeText={setAmount} placeholder="Amount" placeholderTextColor={Colors.mutedDark} keyboardType="numeric"
              style={{ backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.borderLight, borderRadius: BorderRadius.input, padding: 14, color: Colors.foreground, fontSize: 15, marginBottom: 12 }} />

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
              <TouchableOpacity onPress={() => setCategoryId('')}
                style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: BorderRadius.badge, borderWidth: 1, borderColor: !categoryId ? Colors.primary : Colors.borderLight }}>
                <Text style={{ fontSize: 11, color: !categoryId ? Colors.primary : Colors.muted }}>None</Text>
              </TouchableOpacity>
              {categories.map(c => (
                <TouchableOpacity key={c.id} onPress={() => setCategoryId(c.id)}
                  style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: BorderRadius.badge, borderWidth: 1, borderColor: categoryId === c.id ? Colors.primary : Colors.borderLight }}>
                  <Text style={{ fontSize: 11, color: categoryId === c.id ? Colors.primary : Colors.muted }}>{c.icon} {c.name}</Text>
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
                <Text style={{ color: '#000', fontWeight: '600' }}>{busy ? 'Adding...' : 'Add Transaction'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}
