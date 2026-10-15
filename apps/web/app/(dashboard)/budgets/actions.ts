'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import * as budgetLib from '@/lib/api/budgets'

export async function getBudgets() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  return budgetLib.getBudgets(supabase, user.id)
}

export async function createBudget(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const thresholds = formData.get('alert_thresholds') as string || '80,100'
  const alertThresholds = thresholds.split(',').map(t => parseInt(t.trim())).filter(t => !isNaN(t))

  const result = await budgetLib.createBudget(supabase, user.id, {
    categoryId: (formData.get('category_id') as string) || null,
    amount: parseFloat(formData.get('amount') as string),
    period: (formData.get('period') as string) || 'monthly',
    startDate: (formData.get('start_date') as string) || undefined,
    autoRenew: formData.get('auto_renew') === 'true',
    alertThresholds,
  })

  revalidatePath('/budgets')
  revalidatePath('/dashboard')
  return result
}

export async function updateBudget(budgetId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const thresholds = formData.get('alert_thresholds') as string
  const alertThresholds = thresholds ? thresholds.split(',').map(t => parseInt(t.trim())).filter(t => !isNaN(t)) : undefined

  const result = await budgetLib.updateBudget(supabase, user.id, budgetId, {
    amount: parseFloat(formData.get('amount') as string),
    period: formData.get('period') as string,
    autoRenew: formData.get('auto_renew') === 'true',
    alertThresholds,
  })

  revalidatePath('/budgets')
  revalidatePath('/dashboard')
  return result
}

export async function deleteBudget(budgetId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const result = await budgetLib.deleteBudget(supabase, user.id, budgetId)

  revalidatePath('/budgets')
  revalidatePath('/dashboard')
  return result
}

export async function updateBudgetProfile(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const monthly_income = formData.get('monthly_income')
  const monthly_budget = formData.get('monthly_budget')

  const updates: any = {}
  if (monthly_income) updates.monthly_income = parseFloat(monthly_income as string)
  if (monthly_budget) updates.monthly_budget = parseFloat(monthly_budget as string)

  const { error } = await supabase
    .from('user_profiles')
    .upsert({ id: user.id, ...updates })

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard')
  revalidatePath('/budgets')
  return { success: true, message: 'Profile updated successfully!' }
}

export async function checkAndFireBudgetAlerts(userId: string) {
  const supabase = await createClient()
  await budgetLib.checkAndFireBudgetAlerts(supabase, userId)
}
