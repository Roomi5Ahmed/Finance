import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import BudgetClient from './BudgetClient'

export default async function BudgetsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/signin')
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('monthly_income, monthly_budget')
    .eq('id', user.id)
    .single()

  const { data: budgets } = await supabase
    .from('budgets')
    .select('*, categories(id, name, icon, color)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .order('name')

  // Fetch current month spend per budget
  const now = new Date()
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const budgetsWithSpend = await Promise.all(
    (budgets || []).map(async (budget: any) => {
      let spent = 0

      if (budget.category_id) {
        const { data: txs } = await supabase
          .from('transactions')
          .select('amount')
          .eq('user_id', user.id)
          .eq('category_id', budget.category_id)
          .gte('date', periodStart)
          .lt('amount', 0)

        spent = (txs || []).reduce((sum: number, tx: any) => sum + Math.abs(tx.amount), 0)
      } else {
        const { data: txs } = await supabase
          .from('transactions')
          .select('amount')
          .eq('user_id', user.id)
          .gte('date', periodStart)
          .lt('amount', 0)

        spent = (txs || []).reduce((sum: number, tx: any) => sum + Math.abs(tx.amount), 0)
      }

      const percentage = budget.amount > 0 ? Math.min(100, Math.round((spent / budget.amount) * 100)) : 0

      // Days left in period
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

  // Overall spend (no category filter)
  const { data: allExpenses } = await supabase
    .from('transactions')
    .select('amount')
    .eq('user_id', user.id)
    .gte('date', periodStart)
    .lt('amount', 0)

  const totalMonthlySpend = (allExpenses || []).reduce((sum: number, tx: any) => sum + Math.abs(tx.amount), 0)

  return (
    <BudgetClient
      profile={profile}
      budgets={budgetsWithSpend}
      categories={categories || []}
      totalMonthlySpend={totalMonthlySpend}
    />
  )
}
