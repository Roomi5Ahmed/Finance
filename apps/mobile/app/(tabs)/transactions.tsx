import React, { useState, useEffect, useCallback } from 'react'
import { View, Text, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, TextInput, Alert, Modal, KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
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
  const [reviewGroups, setReviewGroups] = useState<any[]>([])
  const [showReview, setShowReview] = useState(false)
  const [skippedPayees, setSkippedPayees] = useState<string[]>([])
  const [editTxn, setEditTxn] = useState<any | null>(null)

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

    // Review queue (PRD 4.4) — non-blocking, banner appears when ready.
    api.getReview()
      .then(r => setReviewGroups(r.groups || []))
      .catch(() => {})
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

  // --- Review queue (PRD 4.4) -------------------------------------------

  const openReview = async () => {
    hapticTap()
    setShowReview(true)
    try {
      const r = await api.getReview()
      setReviewGroups(r.groups || [])
    } catch {
      // keep whatever we already have
    }
  }

  const handleResolveReview = async (group: any, categoryId: string) => {
    setBusy(true)
    hapticTap()
    try {
      await api.resolveReview({ payee: group.payee, categoryId, applyToAll: true })
      hapticSuccess()
      setReviewGroups(prev => prev.filter(g => g.key !== group.key))
    } catch (e: any) {
      hapticError()
      Alert.alert('Error', e.message || 'Failed to apply category')
    } finally {
      setBusy(false)
    }
  }

  const skipReviewGroup = (group: any) => {
    hapticTap()
    setSkippedPayees(prev => [...prev, group.key])
    setReviewGroups(prev => prev.filter(g => g.key !== group.key))
  }

  // --- Single-transaction category change + apply-to-all offer (PRD 4.5) -

  const handleEditCategory = async (categoryId: string | null) => {
    if (!editTxn) return
    setBusy(true)
    try {
      const result = await api.setTransactionCategory(editTxn.id, categoryId)
      setEditTxn(null)
      hapticSuccess()

      if (result.payee && categoryId && result.count > 1) {
        // Default action is "Apply to all" (PRD 4.5: offer, default on).
        Alert.alert(
          'Apply to all?',
          `Apply this category to all ${result.count} transactions from “${result.payee}”? Future payments will get it automatically.`,
          [
            {
              text: 'Apply to all',
              onPress: async () => {
                try {
                  await api.resolveReview({ payee: result.payee!, categoryId, applyToAll: true })
                  hapticSuccess()
                } catch (e: any) {
                  hapticError()
                  Alert.alert('Error', e.message)
                } finally {
                  await fetchData()
                }
              },
            },
            { text: 'Just this one', onPress: () => fetchData() },
          ],
          { cancelable: true }
        )
      } else {
        await fetchData()
      }
    } catch (e: any) {
      hapticError()
      Alert.alert('Error', e.message || 'Failed to update category')
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

  const visibleReview = reviewGroups.filter(g => !skippedPayees.includes(g.key))
  const reviewTxnCount = visibleReview.reduce((sum, g) => sum + (g.count || 0), 0)
  const personalTransfers = categories.find(
    c => (c.name || '').toLowerCase() === 'personal transfers'
  )

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

        {/* Review queue banner (PRD 4.4) */}
        {reviewTxnCount > 0 && (
          <TouchableOpacity onPress={openReview}
            style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10,
              marginTop: 12, padding: 12, borderRadius: BorderRadius.button,
              backgroundColor: 'rgba(233,237,201,0.18)', borderWidth: 1, borderColor: 'rgba(233,237,201,0.4)',
            }}>
            <Text style={{ color: Colors.foreground, fontSize: 13, flex: 1 }}>
              {reviewTxnCount} transaction{reviewTxnCount !== 1 ? 's' : ''} from {visibleReview.length}{' '}
              payee{visibleReview.length !== 1 ? 's' : ''} need a category
            </Text>
            <Text style={{ color: '#000', backgroundColor: Colors.foreground, fontSize: 12, fontWeight: '700', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, overflow: 'hidden' }}>
              Review
            </Text>
          </TouchableOpacity>
        )}
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
          <TouchableOpacity onPress={() => setEditTxn(item)} activeOpacity={0.7}
            style={{
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
          </TouchableOpacity>
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
      {/* Review queue modal (PRD 4.4) */}
      <Modal visible={showReview} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' }}>
          <View style={{
            backgroundColor: Colors.surface, borderTopLeftRadius: BorderRadius.modal, borderTopRightRadius: BorderRadius.modal,
            padding: 24, paddingBottom: 40, maxHeight: '85%',
          }}>
            <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 20, color: Colors.foreground, fontWeight: '700' }}>
              Needs review
            </Text>
            <Text style={{ color: Colors.muted, fontSize: 13, marginTop: 4, marginBottom: 16 }}>
              {visibleReview.length === 0
                ? 'Nothing needs a category.'
                : `${visibleReview.length} payee${visibleReview.length !== 1 ? 's' : ''} — one tap assigns a payee, past and future.`}
            </Text>

            {visibleReview.length === 0 ? (
              <View style={{ alignItems: 'center', padding: 24 }}>
                <Text style={{ color: Colors.foreground, fontSize: 15, fontWeight: '600', marginBottom: 4 }}>
                  All clear
                </Text>
                <Text style={{ color: Colors.muted, fontSize: 13 }}>
                  {skippedPayees.length > 0
                    ? `${skippedPayees.length} skipped — they reappear next time.`
                    : 'Every transaction has a category.'}
                </Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 440 }} showsVerticalScrollIndicator={false}>
                {visibleReview.map(group => (
                  <View key={group.key} style={{
                    borderWidth: 1, borderColor: Colors.border, borderRadius: 12,
                    padding: 14, marginBottom: 10, backgroundColor: Colors.background,
                  }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={{ color: Colors.foreground, fontSize: 15, fontWeight: '700' }}>
                          {group.payee}
                        </Text>
                        <Text style={{ color: Colors.muted, fontSize: 12, marginTop: 3 }}>
                          {group.count} txn{group.count !== 1 ? 's' : ''} · {formatINR(group.total)} total
                          {group.payeeType === 'person' ? ' · Person' : group.payeeType === 'business' ? ' · Business' : ''}
                        </Text>
                      </View>
                      <TouchableOpacity onPress={() => skipReviewGroup(group)} disabled={busy}
                        style={{ paddingHorizontal: 8, paddingVertical: 6 }}>
                        <Text style={{ color: Colors.muted, fontSize: 12, fontWeight: '600' }}>Skip</Text>
                      </TouchableOpacity>
                    </View>

                    {group.suggestion && (
                      <View style={{
                        flexDirection: 'row', gap: 6, alignItems: 'center', marginTop: 8,
                        backgroundColor: 'rgba(233,237,201,0.15)', borderWidth: 1, borderColor: 'rgba(233,237,201,0.35)',
                        borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7,
                      }}>
                        <Text style={{ color: Colors.foreground, fontSize: 12 }}>
                          <Text style={{ fontWeight: '700' }}>AI suggests </Text>
                          {group.suggestion.icon} {group.suggestion.name} ({Math.round(group.suggestion.confidence * 100)}%)
                        </Text>
                      </View>
                    )}

                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                      {personalTransfers && (
                        <TouchableOpacity onPress={() => handleResolveReview(group, personalTransfers.id)} disabled={busy}
                          style={{ paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: Colors.borderLight, backgroundColor: Colors.surface }}>
                          <Text style={{ color: Colors.foreground, fontSize: 11, fontWeight: '600', fontStyle: 'italic' }}>
                            ⇄ Personal Transfer
                          </Text>
                        </TouchableOpacity>
                      )}
                      {categories.map(c => {
                        const suggested = group.suggestion?.categoryId === c.id
                        return (
                          <TouchableOpacity key={c.id} onPress={() => handleResolveReview(group, c.id)} disabled={busy}
                            style={{
                              paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999,
                              borderWidth: suggested ? 1.5 : 1,
                              borderColor: suggested ? Colors.primary : Colors.borderLight,
                              backgroundColor: suggested ? 'rgba(255,152,162,0.12)' : Colors.surface,
                            }}>
                            <Text style={{ color: suggested ? Colors.primary : Colors.foreground, fontSize: 11, fontWeight: '600' }}>
                              {c.icon} {c.name}
                            </Text>
                          </TouchableOpacity>
                        )
                      })}
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}

            <TouchableOpacity onPress={() => setShowReview(false)}
              style={{ marginTop: 16, padding: 14, borderRadius: BorderRadius.button, alignItems: 'center', borderWidth: 1, borderColor: Colors.borderLight }}>
              <Text style={{ color: Colors.muted, fontWeight: '600' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Change category modal — tap a transaction (PRD 4.5) */}
      <Modal visible={!!editTxn} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: Colors.surface, borderTopLeftRadius: BorderRadius.modal, borderTopRightRadius: BorderRadius.modal, padding: 24, paddingBottom: 40 }}>
            <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 20, color: Colors.foreground, fontWeight: '700', marginBottom: 4 }}>
              {editTxn?.merchant}
            </Text>
            <Text style={{ color: Colors.muted, fontSize: 13, marginBottom: 16 }}>
              {editTxn && `${editTxn.amount < 0 ? '-' : '+'}${formatINR(Math.abs(editTxn.amount))} · ${new Date(editTxn.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`}
              {' · pick a category'}
            </Text>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
              <TouchableOpacity onPress={() => handleEditCategory(null)} disabled={busy}
                style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: BorderRadius.badge, borderWidth: 1, borderColor: !editTxn?.category_id ? Colors.primary : Colors.borderLight }}>
                <Text style={{ fontSize: 11, color: !editTxn?.category_id ? Colors.primary : Colors.muted }}>None</Text>
              </TouchableOpacity>
              {categories.map(c => (
                <TouchableOpacity key={c.id} onPress={() => handleEditCategory(c.id)} disabled={busy}
                  style={{
                    paddingHorizontal: 10, paddingVertical: 6, borderRadius: BorderRadius.badge,
                    borderWidth: 1, borderColor: editTxn?.category_id === c.id ? Colors.primary : Colors.borderLight,
                    backgroundColor: editTxn?.category_id === c.id ? 'rgba(255,152,162,0.1)' : 'transparent',
                  }}>
                  <Text style={{ fontSize: 11, color: editTxn?.category_id === c.id ? Colors.primary : Colors.muted }}>
                    {c.icon} {c.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity onPress={() => setEditTxn(null)}
              style={{ padding: 14, borderRadius: BorderRadius.button, alignItems: 'center', borderWidth: 1, borderColor: Colors.borderLight }}>
              <Text style={{ color: Colors.muted, fontWeight: '500' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}
