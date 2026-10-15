'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import * as subLib from '@/lib/api/subscriptions'

export async function detectSubscriptions() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const result = await subLib.detectSubscriptions(supabase, user.id)

  revalidatePath('/subscriptions')
  revalidatePath('/dashboard')
  return result
}

export async function getSubscriptions() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  return subLib.getSubscriptions(supabase, user.id)
}

export async function updateSubscriptionStatus(subscriptionId: string, status: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const result = await subLib.updateSubscriptionStatus(supabase, user.id, subscriptionId, status)

  revalidatePath('/subscriptions')
  return result
}

export async function createSubscription(data: {
  merchant: string
  amount: number
  cadence: string
  category_id?: string
  next_expected_at?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const result = await subLib.createSubscription(supabase, user.id, {
    merchant: data.merchant,
    amount: data.amount,
    cadence: data.cadence,
    categoryId: data.category_id,
    nextExpectedAt: data.next_expected_at,
  })

  revalidatePath('/subscriptions')
  revalidatePath('/dashboard')
  return result
}

export async function deleteSubscription(subscriptionId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const result = await subLib.deleteSubscription(supabase, user.id, subscriptionId)

  revalidatePath('/subscriptions')
  return result
}
