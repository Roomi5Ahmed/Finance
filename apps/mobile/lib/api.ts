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

export const api = {
  syncBank: () => apiCall('/api/transactions/sync', { method: 'POST' }),
  categorise: () => apiCall('/api/transactions/categorise', { method: 'POST' }),
  getCategories: () => apiCall('/api/categories'),
  createBudget: (body: any) => apiCall('/api/budgets', { method: 'POST', body: JSON.stringify(body) }),
  getBudgets: () => apiCall('/api/budgets'),
  scanSubscriptions: () => apiCall('/api/subscriptions/scan', { method: 'POST' }),
  updateSubscription: (id: string, body: any) =>
    apiCall(`/api/subscriptions/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  createBill: (body: any) => apiCall('/api/bills', { method: 'POST', body: JSON.stringify(body) }),
  getBills: () => apiCall('/api/bills'),
  payBill: (id: string) => apiCall(`/api/bills/${id}/pay`, { method: 'POST' }),
  getInsights: (context: any) =>
    apiCall('/api/insights/category', { method: 'POST', body: JSON.stringify({ context }) }),
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
