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

  // Fetch user profile for budget info
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('monthly_income, monthly_budget')
    .eq('id', user.id)
    .single()

  return <BudgetClient profile={profile} />
}
