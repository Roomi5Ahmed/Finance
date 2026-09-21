'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { createNotification } from '@/lib/notifications'

export async function getBudgets() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('budgets')
    .select('*, categories(id, name, icon, color)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return []
  return data || []
}

export async function createBudget(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const categoryId = formData.get('category_id') as string || null
  const amount = parseFloat(formData.get('amount') as string)
  const period = formData.get('period') as string || 'monthly'
  const startDate = formData.get('start_date') as string || new Date().toISOString().split('T')[0]
  const autoRenew = formData.get('auto_renew') === 'true'
  const thresholds = formData.get('alert_thresholds') as string || '80,100'

  if (!amount || amount <= 0) throw new Error('Budget amount must be positive')

  const alertThresholds = thresholds.split(',').map(t => parseInt(t.trim())).filter(t => !isNaN(t))

  const { error } = await supabase.from('budgets').insert({
    user_id: user.id,
    category_id: categoryId,
    amount,
    period,
    start_date: startDate,
    auto_renew: autoRenew,
    alert_thresholds: alertThresholds,
  })

  if (error) {
    if (error.code === '23505') throw new Error('A budget for this category and period already exists.')
    throw new Error(error.message)
  }

  revalidatePath('/budgets')
  revalidatePath('/dashboard')
  return { success: true, message: 'Budget created successfully!' }
}

export async function updateBudget(budgetId: string, formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const amount = parseFloat(formData.get('amount') as string)
  const period = formData.get('period') as string
  const autoRenew = formData.get('auto_renew') === 'true'
  const thresholds = formData.get('alert_thresholds') as string

  const updates: any = {}
  if (!isNaN(amount) && amount > 0) updates.amount = amount
  if (period) updates.period = period
  updates.auto_renew = autoRenew
  if (thresholds) {
    updates.alert_thresholds = thresholds.split(',').map(t => parseInt(t.trim())).filter(t => !isNaN(t))
  }
  updates.updated_at = new Date().toISOString()

  const { error } = await supabase
    .from('budgets')
    .update(updates)
    .eq('id', budgetId)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)

  revalidatePath('/budgets')
  revalidatePath('/dashboard')
  return { success: true, message: 'Budget updated successfully!' }
}

export async function deleteBudget(budgetId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('budgets')
    .delete()
    .eq('id', budgetId)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)

  revalidatePath('/budgets')
  revalidatePath('/dashboard')
  return { success: true, message: 'Budget deleted.' }
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

  const now = new Date()
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]

  const { data: budgets } = await supabase
    .from('budgets')
    .select('*, categories(name)')
    .eq('user_id', userId)
    .eq('period', 'monthly')
    .eq('auto_renew', true)

  if (!budgets || budgets.length === 0) return

  for (const budget of budgets) {
    const { data: txs } = await supabase
      .from('transactions')
      .select('amount')
      .eq('user_id', userId)
      .gte('date', periodStart)
      .lt('amount', 0)

    let spent = 0
    if (budget.category_id) {
      spent = (txs || [])
        .filter((tx: any) => tx.amount < 0)
        .reduce((sum: number) => sum + Math.abs(0), 0)

      const { data: catTxs } = await supabase
        .from('transactions')
        .select('amount')
        .eq('user_id', userId)
        .eq('category_id', budget.category_id)
        .gte('date', periodStart)
        .lt('amount', 0)

      spent = (catTxs || []).reduce((sum: number, tx: any) => sum + Math.abs(tx.amount), 0)
    } else {
      spent = (txs || []).reduce((sum: number, tx: any) => sum + Math.abs(tx.amount), 0)
    }

    const percentage = Math.round((spent / budget.amount) * 100)

    const { data: alreadySent } = await supabase
      .from('budget_alerts_sent')
      .select('threshold')
      .eq('budget_id', budget.id)
      .eq('period_start', periodStart)

    const sentThresholds = new Set((alreadySent || []).map((a: any) => a.threshold))

    for (const threshold of budget.alert_thresholds) {
      if (percentage >= threshold && !sentThresholds.has(threshold)) {
        const catName = (budget.categories as any)?.name || 'Overall'
        const title = threshold >= 100 ? `Budget exceeded: ${catName}` : `Budget alert: ${catName}`
        const body = `You've used ${percentage}% of your ${catName} budget (₹${spent.toLocaleString('en-IN')} / ₹${budget.amount.toLocaleString('en-IN')}).`

        await createNotification(userId, 'budget_alert', title, body, {
          budget_id: budget.id,
          percentage,
          threshold,
          spent,
          budget_amount: budget.amount,
        })

        await supabase.from('budget_alerts_sent').insert({
          budget_id: budget.id,
          period_start: periodStart,
          threshold,
        })
      }
    }
  }
}
