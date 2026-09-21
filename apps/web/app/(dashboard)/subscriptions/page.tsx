import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import SubscriptionsClient from '@/components/subscriptions/SubscriptionsClient'

export default async function SubscriptionsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/signin')
  }

  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('*, categories(name, icon, color)')
    .eq('user_id', user.id)
    .order('avg_amount', { ascending: false })

  const activeSubs = (subscriptions || []).filter(s => s.status === 'active' || s.status === 'candidate')
  const totalMonthly = activeSubs.reduce((sum, s) => {
    const amt = Number(s.avg_amount) || 0
    switch (s.cadence) {
      case 'weekly': return sum + amt * 4.33
      case 'quarterly': return sum + amt / 3
      case 'annual': return sum + amt / 12
      default: return sum + amt
    }
  }, 0)

  const totalAnnual = totalMonthly * 12

  return (
    <SubscriptionsClient
      subscriptions={subscriptions || []}
      totalMonthly={totalMonthly}
      totalAnnual={totalAnnual}
    />
  )
}
