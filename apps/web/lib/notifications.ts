'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import * as notifLib from '@/lib/api/notifications'

export async function getNotifications(limit = 20) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  return notifLib.getNotifications(supabase, user.id, limit)
}

export async function getUnreadCount() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 0
  return notifLib.getUnreadCount(supabase, user.id)
}

export async function markAsRead(notificationId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const result = await notifLib.markAsRead(supabase, user.id, notificationId)
  if (result) revalidatePath('/dashboard')
  return result
}

export async function markAllAsRead() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const result = await notifLib.markAllAsRead(supabase, user.id)
  if (result) revalidatePath('/dashboard')
  return result
}

export async function deleteNotification(notificationId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const result = await notifLib.deleteNotification(supabase, user.id, notificationId)
  if (result) revalidatePath('/dashboard')
  return result
}
