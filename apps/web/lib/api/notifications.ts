import type { SupabaseClient } from '@supabase/supabase-js'

type NotificationType = 'budget_alert' | 'bill_reminder' | 'subscription_price_change' | 'subscription_detected' | 'info'

export async function createNotification(
  supabase: SupabaseClient,
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  data: Record<string, any> = {}
) {
  const { error } = await supabase.from('notifications').insert({
    user_id: userId,
    type,
    title,
    body,
    data,
  })

  if (error) {
    console.error('Failed to create notification:', error)
    return null
  }
  return true
}

export async function getNotifications(supabase: SupabaseClient, userId: string, limit = 20) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return []
  return data || []
}

export async function getUnreadCount(supabase: SupabaseClient, userId: string) {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false)

  if (error) return 0
  return count || 0
}

export async function markAsRead(supabase: SupabaseClient, userId: string, notificationId: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId)
    .eq('user_id', userId)

  return !error
}

export async function markAllAsRead(supabase: SupabaseClient, userId: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false)

  return !error
}

export async function deleteNotification(supabase: SupabaseClient, userId: string, notificationId: string) {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId)
    .eq('user_id', userId)

  return !error
}
