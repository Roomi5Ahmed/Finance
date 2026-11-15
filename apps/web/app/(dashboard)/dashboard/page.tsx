import { createClient } from '@/utils/supabase/server'
import DashboardContent from '@/components/dashboard/DashboardContent'
import TrendsCard from '@/components/dashboard/TrendsCard'
import {
  currentMonthKey,
  getAvailableMonths,
  getDashboardMonth,
  getTrends,
  monthRange,
} from '@/lib/api/dashboard'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { month: monthParam } = await searchParams
  const current = currentMonthKey()
  const month = monthParam && monthRange(monthParam) ? monthParam : current

  const [availableMonths, data, trends] = await Promise.all([
    getAvailableMonths(supabase, user.id),
    getDashboardMonth(supabase, user.id, month),
    getTrends(supabase, user.id, 12),
  ])

  return (
    <div className="flex flex-col gap-8">
      <DashboardContent
        month={data.month}
        monthLabel={data.label}
        shortLabel={data.shortLabel}
        isCurrentMonth={data.isCurrentMonth}
        partial={data.partial}
        availableMonths={availableMonths}
        transactions={data.transactions}
        userEmail={user.email || ''}
        monthlyBudget={data.monthlyBudget}
        budgets={data.budgets}
        upcomingBills={data.upcomingBills}
        subscriptionCount={data.subscriptionCount}
        subscriptionMonthlyCost={data.subscriptionMonthlyCost}
        subscriptionsCharged={data.subscriptionsCharged}
        comparison={data.comparison}
        dailySeries={data.dailySeries}
      />
      <TrendsCard trends={trends} currentMonth={current} />
    </div>
  )
}
