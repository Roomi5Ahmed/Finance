import { createClient } from '@/utils/supabase/server'
import DashboardContent from '@/components/dashboard/DashboardContent'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: txs } = await supabase
    .from('transactions')
    .select('id, amount, date, merchant, categories(name, icon, color)')
    .eq('user_id', user.id)
    .order('date', { ascending: false })

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('monthly_income, monthly_budget')
    .eq('id', user.id)
    .single()

  // Fetch category budgets with current spend
  const { data: budgets } = await supabase
    .from('budgets')
    .select('*, categories(name, icon, color)')
    .eq('user_id', user.id)
    .eq('period', 'monthly')

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
      return { ...budget, spent }
    })
  )

  // Fetch upcoming bills
  const { data: bills } = await supabase
    .from('bills')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('next_due_at', { ascending: true })
    .limit(3)

  // Fetch active subscriptions count and monthly cost
  const { data: subs } = await supabase
    .from('subscriptions')
    .select('avg_amount, cadence')
    .eq('user_id', user.id)
    .in('status', ['active', 'candidate'])

  const totalSubMonthly = (subs || []).reduce((sum: number, s: any) => {
    const amt = Number(s.avg_amount) || 0
    switch (s.cadence) {
      case 'weekly': return sum + amt * 4.33
      case 'quarterly': return sum + amt / 3
      case 'annual': return sum + amt / 12
      default: return sum + amt
    }
  }, 0)

  const transactions = txs || []

  return (
    <DashboardContent
      transactions={transactions}
      userEmail={user.email || ''}
      monthlyBudget={profile?.monthly_budget || 50000}
      monthlyIncome={profile?.monthly_income || 0}
      budgets={budgetsWithSpend}
      upcomingBills={bills || []}
      subscriptionCount={subs?.length || 0}
      subscriptionMonthlyCost={totalSubMonthly}
    />
  )
}
