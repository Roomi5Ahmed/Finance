import { supabase } from './supabase'

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3000'

export async function apiCall(path: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) throw new Error('Not authenticated')

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      ...options.headers,
    },
  })

  const json = await res.json()
  if (!res.ok) throw new Error(json.error || `API error ${res.status}`)
  return json
}

export interface AvailableMonth {
  month: string
  txn_count: number
}

export interface DashboardMonthPayload {
  month: string
  label: string
  shortLabel: string
  isCurrentMonth: boolean
  partial: boolean
  income: number
  expenses: number
  net: number
  savingsRate: number | null
  txnCount: number
  transactions: { id: string; date: string; amount: number; merchant: string | null }[]
  dailySeries: { day: number; value: number }[]
  categories: { categoryId: string | null; name: string; icon: string | null; value: number }[]
  budgets: {
    id: string
    amount: number
    spent: number
    categories?: { name?: string | null; icon?: string | null } | null
  }[]
  upcomingBills: { id: string; name: string; amount_estimate: number | null; next_due_at: string }[]
  monthlyBudget: number
  subscriptionCount: number
  subscriptionMonthlyCost: number
  subscriptionsCharged: { count: number; total: number } | null
}

export interface TrendsPayload {
  months: {
    month: string
    label: string
    income: number
    expenses: number
    net: number
    savingsRate: number | null
  }[]
}

export const api = {
  getDashboard: (month?: string) =>
    apiCall(month ? `/api/dashboard?month=${encodeURIComponent(month)}` : '/api/dashboard'),
  getDashboardMonths: () => apiCall('/api/dashboard/months'),
  getTrends: (months = 6) => apiCall(`/api/dashboard/trends?months=${months}`),
  syncBank: () => apiCall('/api/transactions/sync', { method: 'POST' }),
  categorise: () => apiCall('/api/transactions/categorise', { method: 'POST' }),
  getReview: () => apiCall('/api/transactions/review'),
  resolveReview: (body: {
    payee: string
    categoryId: string
    applyToAll: boolean
    txnId?: string
  }) => apiCall('/api/transactions/review/resolve', { method: 'POST', body: JSON.stringify(body) }),
  setTransactionCategory: (id: string, categoryId: string | null) =>
    apiCall('/api/transactions/set-category', {
      method: 'POST',
      body: JSON.stringify({ id, categoryId }),
    }),
  getCategories: () => apiCall('/api/categories'),
  createBudget: (body: any) => apiCall('/api/budgets', { method: 'POST', body: JSON.stringify(body) }),
  getBudgets: () => apiCall('/api/budgets'),
  scanSubscriptions: () => apiCall('/api/subscriptions/scan', { method: 'POST' }),
  updateSubscription: (id: string, body: any) =>
    apiCall(`/api/subscriptions/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  createBill: (body: any) => apiCall('/api/bills', { method: 'POST', body: JSON.stringify(body) }),
  getBills: () => apiCall('/api/bills'),
  payBill: (id: string) => apiCall(`/api/bills/${id}/pay`, { method: 'POST' }),
  getInsights: (context: any, month?: string) =>
    apiCall('/api/insights/category', {
      method: 'POST',
      body: JSON.stringify(month ? { context, month } : { context }),
    }),
  registerDevice: (expoPushToken: string, platform: string) =>
    apiCall('/api/notifications/register-device', {
      method: 'POST',
      body: JSON.stringify({ expoPushToken, platform }),
    }),
  getNotifications: (limit = 20) => apiCall(`/api/notifications?limit=${limit}`),
  markNotificationRead: (id: string) =>
    apiCall('/api/notifications', { method: 'PATCH', body: JSON.stringify({ action: 'markRead', id }) }),
  markAllNotificationsRead: () =>
    apiCall('/api/notifications', { method: 'PATCH', body: JSON.stringify({ action: 'markAllRead' }) }),
}
