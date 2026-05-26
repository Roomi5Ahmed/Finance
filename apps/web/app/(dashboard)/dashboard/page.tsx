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

  const transactions = txs || []

  return (
    <DashboardContent 
      transactions={transactions} 
      userEmail={user.email || ''} 
      monthlyBudget={profile?.monthly_budget || 50000}
      monthlyIncome={profile?.monthly_income || 0}
    />
  )
}
