'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import * as billLib from '@/lib/api/bills'

export async function getBills() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  return billLib.getBills(supabase, user.id)
}

export async function createBill(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const result = await billLib.createBill(supabase, user.id, {
    name: formData.get('name') as string,
    amountEstimate: formData.get('amount_estimate') ? parseFloat(formData.get('amount_estimate') as string) : null,
    recurrence: (formData.get('recurrence') as string) || 'monthly',
    dayOfMonth: parseInt(formData.get('day_of_month') as string || '1'),
    reminderLeadDays: parseInt(formData.get('reminder_lead_days') as string || '3'),
  })

  revalidatePath('/bills')
  return result
}

export async function updateBill(billId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const result = await billLib.updateBill(supabase, user.id, billId, {
    name: formData.get('name') as string,
    amountEstimate: formData.get('amount_estimate') ? parseFloat(formData.get('amount_estimate') as string) : undefined,
    recurrence: formData.get('recurrence') as string,
    dayOfMonth: parseInt(formData.get('day_of_month') as string),
    reminderLeadDays: parseInt(formData.get('reminder_lead_days') as string),
  })

  revalidatePath('/bills')
  return result
}

export async function deleteBill(billId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const result = await billLib.deleteBill(supabase, user.id, billId)

  revalidatePath('/bills')
  return result
}

export async function markBillAsPaid(billId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const result = await billLib.markBillAsPaid(supabase, user.id, billId)

  revalidatePath('/bills')
  return result
}

export async function checkAndFireBillReminders(userId: string) {
  const supabase = await createClient()
  await billLib.checkAndFireBillReminders(supabase, userId)
}
