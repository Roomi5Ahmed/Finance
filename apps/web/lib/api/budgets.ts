import type { SupabaseClient } from '@supabase/supabase-js'
import { createNotification } from './notifications'
import { sendPushToUser } from '@/lib/push'

export async function getBudgets(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('budgets')
    .select('*, categories(id, name, icon, color)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) return []
  return data || []
}

export interface CreateBudgetInput {
  categoryId?: string | null
  amount: number
  period?: string
  startDate?: string
  autoRenew?: boolean
  alertThresholds?: number[]
}

export async function createBudget(supabase: SupabaseClient, userId: string, input: CreateBudgetInput) {
  const amount = input.amount
  if (!amount || amount <= 0) throw new Error('Budget amount must be positive')

  const { error } = await supabase.from('budgets').insert({
    user_id: userId,
    category_id: input.categoryId || null,
    amount,
    period: input.period || 'monthly',
    start_date: input.startDate || new Date().toISOString().split('T')[0],
    auto_renew: input.autoRenew ?? true,
    alert_thresholds: input.alertThresholds && input.alertThresholds.length > 0 ? input.alertThresholds : [80, 100],
  })

  if (error) {
    if (error.code === '23505') throw new Error('A budget for this category and period already exists.')
    throw new Error(error.message)
  }

  return { success: true, message: 'Budget created successfully!' }
}

export interface UpdateBudgetInput {
  amount?: number
  period?: string
  autoRenew?: boolean
  alertThresholds?: number[]
}

export async function updateBudget(supabase: SupabaseClient, userId: string, budgetId: string, input: UpdateBudgetInput) {
  const updates: any = {}
  if (input.amount !== undefined && !isNaN(input.amount) && input.amount > 0) updates.amount = input.amount
  if (input.period) updates.period = input.period
  if (input.autoRenew !== undefined) updates.auto_renew = input.autoRenew
  if (input.alertThresholds) updates.alert_thresholds = input.alertThresholds
  updates.updated_at = new Date().toISOString()

  const { error } = await supabase
    .from('budgets')
    .update(updates)
    .eq('id', budgetId)
    .eq('user_id', userId)

  if (error) throw new Error(error.message)
  return { success: true, message: 'Budget updated successfully!' }
}

export async function deleteBudget(supabase: SupabaseClient, userId: string, budgetId: string) {
  const { error } = await supabase
    .from('budgets')
    .delete()
    .eq('id', budgetId)
    .eq('user_id', userId)

  if (error) throw new Error(error.message)
  return { success: true, message: 'Budget deleted.' }
}

export async function getBudgetsWithProgress(supabase: SupabaseClient, userId: string) {
  const budgets = await getBudgets(supabase, userId)
  const now = new Date()
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const budgetsWithSpend = await Promise.all(
    budgets.map(async (budget: any) => {
      let spent = 0

      if (budget.category_id) {
        const { data: txs } = await supabase
          .from('transactions')
          .select('amount')
          .eq('user_id', userId)
          .eq('category_id', budget.category_id)
          .gte('date', periodStart)
          .lt('amount', 0)

        spent = (txs || []).reduce((sum: number, tx: any) => sum + Math.abs(tx.amount), 0)
      } else {
        const { data: txs } = await supabase
          .from('transactions')
          .select('amount')
          .eq('user_id', userId)
          .gte('date', periodStart)
          .lt('amount', 0)

        spent = (txs || []).reduce((sum: number, tx: any) => sum + Math.abs(tx.amount), 0)
      }

      const percentage = budget.amount > 0 ? Math.min(100, Math.round((spent / budget.amount) * 100)) : 0
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      const daysLeft = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / 86400000))

      return {
        ...budget,
        spent,
        percentage,
        daysLeft,
        remaining: Math.max(0, budget.amount - spent),
      }
    })
  )

  const { data: allExpenses } = await supabase
    .from('transactions')
    .select('amount')
    .eq('user_id', userId)
    .gte('date', periodStart)
    .lt('amount', 0)

  const totalMonthlySpend = (allExpenses || []).reduce((sum: number, tx: any) => sum + Math.abs(tx.amount), 0)

  return { budgets: budgetsWithSpend, totalMonthlySpend }
}

export async function checkAndFireBudgetAlerts(supabase: SupabaseClient, userId: string) {
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
    let spent = 0

    if (budget.category_id) {
      const { data: catTxs } = await supabase
        .from('transactions')
        .select('amount')
        .eq('user_id', userId)
        .eq('category_id', budget.category_id)
        .gte('date', periodStart)
        .lt('amount', 0)

      spent = (catTxs || []).reduce((sum: number, tx: any) => sum + Math.abs(tx.amount), 0)
    } else {
      const { data: txs } = await supabase
        .from('transactions')
        .select('amount')
        .eq('user_id', userId)
        .gte('date', periodStart)
        .lt('amount', 0)

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
        const body = `You've used ${percentage}% of your ${catName} budget (\u20B9${spent.toLocaleString('en-IN')} / \u20B9${budget.amount.toLocaleString('en-IN')}).`

        await createNotification(supabase, userId, 'budget_alert', title, body, {
          budget_id: budget.id,
          percentage,
          threshold,
          spent,
          budget_amount: budget.amount,
        })

        sendPushToUser(supabase, userId, { title, body, data: { type: 'budget_alert', budget_id: budget.id } })

        await supabase.from('budget_alerts_sent').insert({
          budget_id: budget.id,
          period_start: periodStart,
          threshold,
        })
      }
    }
  }
}
