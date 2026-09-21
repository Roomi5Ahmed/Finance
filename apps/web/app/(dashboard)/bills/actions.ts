'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { createNotification } from '@/lib/notifications'

export async function getBills() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('bills')
    .select('*')
    .eq('user_id', user.id)
    .order('next_due_at', { ascending: true })

  if (error) return []
  return data || []
}

export async function createBill(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const name = formData.get('name') as string
  const amountEstimate = formData.get('amount_estimate') as string
  const recurrence = formData.get('recurrence') as string || 'monthly'
  const dayOfMonth = parseInt(formData.get('day_of_month') as string || '1')
  const reminderLeadDays = parseInt(formData.get('reminder_lead_days') as string || '3')

  if (!name) throw new Error('Bill name is required')

  const now = new Date()
  let nextDueAt = new Date(now.getFullYear(), now.getMonth(), dayOfMonth)
  if (nextDueAt <= now) {
    nextDueAt.setMonth(nextDueAt.getMonth() + 1)
  }

  const dueRule = { recurrence, day_of_month: dayOfMonth }

  const { error } = await supabase.from('bills').insert({
    user_id: user.id,
    name,
    amount_estimate: amountEstimate ? parseFloat(amountEstimate) : null,
    due_rule: dueRule,
    next_due_at: nextDueAt.toISOString(),
    reminder_lead_days: reminderLeadDays,
    status: 'active',
  })

  if (error) throw new Error(error.message)

  revalidatePath('/bills')
  return { success: true, message: 'Bill created successfully!' }
}

export async function updateBill(billId: string, formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const name = formData.get('name') as string
  const amountEstimate = formData.get('amount_estimate') as string
  const recurrence = formData.get('recurrence') as string
  const dayOfMonth = parseInt(formData.get('day_of_month') as string)
  const reminderLeadDays = parseInt(formData.get('reminder_lead_days') as string)

  const updates: any = { updated_at: new Date().toISOString() }
  if (name) updates.name = name
  if (amountEstimate) updates.amount_estimate = parseFloat(amountEstimate)
  if (recurrence && !isNaN(dayOfMonth)) {
    updates.due_rule = { recurrence, day_of_month: dayOfMonth }
  }
  if (!isNaN(reminderLeadDays)) updates.reminder_lead_days = reminderLeadDays

  const { error } = await supabase
    .from('bills')
    .update(updates)
    .eq('id', billId)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)

  revalidatePath('/bills')
  return { success: true, message: 'Bill updated!' }
}

export async function deleteBill(billId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('bills')
    .delete()
    .eq('id', billId)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)

  revalidatePath('/bills')
  return { success: true, message: 'Bill deleted.' }
}

export async function markBillAsPaid(billId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: bill } = await supabase
    .from('bills')
    .select('*')
    .eq('id', billId)
    .eq('user_id', user.id)
    .single()

  if (!bill) throw new Error('Bill not found')

  // Log payment
  const { error: paymentError } = await supabase.from('bill_payments').insert({
    bill_id: billId,
    paid_at: new Date().toISOString(),
    amount: bill.amount_estimate || 0,
  })

  if (paymentError) throw new Error(paymentError.message)

  // Advance next_due_at based on recurrence
  const dueRule = bill.due_rule as any
  const recurrence = dueRule?.recurrence || 'monthly'
  const dayOfMonth = dueRule?.day_of_month || 1

  const currentDue = new Date(bill.next_due_at)
  let nextDue = new Date(currentDue)

  switch (recurrence) {
    case 'weekly':
      nextDue.setDate(nextDue.getDate() + 7)
      break
    case 'monthly':
      nextDue.setMonth(nextDue.getMonth() + 1)
      nextDue.setDate(dayOfMonth)
      break
    case 'quarterly':
      nextDue.setMonth(nextDue.getMonth() + 3)
      nextDue.setDate(dayOfMonth)
      break
    case 'annual':
      nextDue.setFullYear(nextDue.getFullYear() + 1)
      nextDue.setDate(dayOfMonth)
      break
    default:
      nextDue.setMonth(nextDue.getMonth() + 1)
      nextDue.setDate(dayOfMonth)
  }

  const { error: updateError } = await supabase
    .from('bills')
    .update({
      next_due_at: nextDue.toISOString(),
      status: 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('id', billId)

  if (updateError) throw new Error(updateError.message)

  revalidatePath('/bills')
  return { success: true, message: `"${bill.name}" marked as paid! Next due: ${nextDue.toLocaleDateString('en-IN')}` }
}

export async function checkAndFireBillReminders(userId: string) {
  const supabase = await createClient()

  const now = new Date()
  const { data: bills } = await supabase
    .from('bills')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')

  if (!bills || bills.length === 0) return

  for (const bill of bills) {
    const dueDate = new Date(bill.next_due_at)
    const reminderDate = new Date(dueDate)
    reminderDate.setDate(reminderDate.getDate() - bill.reminder_lead_days)

    if (now >= reminderDate && now < dueDate) {
      // Check if we already sent a reminder for this cycle
      const { data: existing } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', userId)
        .eq('type', 'bill_reminder')
        .eq('data->>bill_id', bill.id)
        .gte('created_at', reminderDate.toISOString())
        .limit(1)

      if (existing && existing.length > 0) continue

      const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / 86400000)
      const title = `Bill due soon: ${bill.name}`
      const body = `"${bill.name}" is due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}${bill.amount_estimate ? ` (₹${bill.amount_estimate.toLocaleString('en-IN')})` : ''}.`

      await createNotification(userId, 'bill_reminder', title, body, {
        bill_id: bill.id,
        due_at: bill.next_due_at,
        amount: bill.amount_estimate,
      })
    }
  }
}
