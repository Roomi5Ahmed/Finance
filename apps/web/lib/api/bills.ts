import type { SupabaseClient } from '@supabase/supabase-js'
import { createNotification } from './notifications'
import { sendPushToUser } from '@/lib/push'

export async function getBills(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('bills')
    .select('*')
    .eq('user_id', userId)
    .order('next_due_at', { ascending: true })

  if (error) return []
  return data || []
}

export interface CreateBillInput {
  name: string
  amountEstimate?: number | null
  recurrence?: string
  dayOfMonth?: number
  reminderLeadDays?: number
}

export async function createBill(supabase: SupabaseClient, userId: string, input: CreateBillInput) {
  if (!input.name) throw new Error('Bill name is required')

  const dayOfMonth = input.dayOfMonth || 1
  const now = new Date()
  let nextDueAt = new Date(now.getFullYear(), now.getMonth(), dayOfMonth)
  if (nextDueAt <= now) {
    nextDueAt.setMonth(nextDueAt.getMonth() + 1)
  }

  const dueRule = { recurrence: input.recurrence || 'monthly', day_of_month: dayOfMonth }

  const { error } = await supabase.from('bills').insert({
    user_id: userId,
    name: input.name,
    amount_estimate: input.amountEstimate || null,
    due_rule: dueRule,
    next_due_at: nextDueAt.toISOString(),
    reminder_lead_days: input.reminderLeadDays ?? 3,
    status: 'active',
  })

  if (error) throw new Error(error.message)
  return { success: true, message: 'Bill created successfully!' }
}

export interface UpdateBillInput {
  name?: string
  amountEstimate?: number
  recurrence?: string
  dayOfMonth?: number
  reminderLeadDays?: number
}

export async function updateBill(supabase: SupabaseClient, userId: string, billId: string, input: UpdateBillInput) {
  const updates: any = { updated_at: new Date().toISOString() }
  if (input.name) updates.name = input.name
  if (input.amountEstimate !== undefined) updates.amount_estimate = input.amountEstimate
  if (input.recurrence && input.dayOfMonth !== undefined && !isNaN(input.dayOfMonth)) {
    updates.due_rule = { recurrence: input.recurrence, day_of_month: input.dayOfMonth }
  }
  if (input.reminderLeadDays !== undefined && !isNaN(input.reminderLeadDays)) updates.reminder_lead_days = input.reminderLeadDays

  const { error } = await supabase
    .from('bills')
    .update(updates)
    .eq('id', billId)
    .eq('user_id', userId)

  if (error) throw new Error(error.message)
  return { success: true, message: 'Bill updated!' }
}

export async function deleteBill(supabase: SupabaseClient, userId: string, billId: string) {
  const { error } = await supabase
    .from('bills')
    .delete()
    .eq('id', billId)
    .eq('user_id', userId)

  if (error) throw new Error(error.message)
  return { success: true, message: 'Bill deleted.' }
}

export async function markBillAsPaid(supabase: SupabaseClient, userId: string, billId: string) {
  const { data: bill } = await supabase
    .from('bills')
    .select('*')
    .eq('id', billId)
    .eq('user_id', userId)
    .single()

  if (!bill) throw new Error('Bill not found')

  const { error: paymentError } = await supabase.from('bill_payments').insert({
    bill_id: billId,
    paid_at: new Date().toISOString(),
    amount: bill.amount_estimate || 0,
  })

  if (paymentError) throw new Error(paymentError.message)

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

  return {
    success: true,
    message: `"${bill.name}" marked as paid! Next due: ${nextDue.toLocaleDateString('en-IN')}`,
    bill: { ...bill, next_due_at: nextDue.toISOString(), status: 'active' },
  }
}

export async function checkAndFireBillReminders(supabase: SupabaseClient, userId: string) {
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
      const body = `"${bill.name}" is due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}${bill.amount_estimate ? ` (\u20B9${bill.amount_estimate.toLocaleString('en-IN')})` : ''}.`

      await createNotification(supabase, userId, 'bill_reminder', title, body, {
        bill_id: bill.id,
        due_at: bill.next_due_at,
        amount: bill.amount_estimate,
      })
      sendPushToUser(supabase, userId, { title, body, data: { type: 'bill_reminder', bill_id: bill.id } })
    }
  }
}
