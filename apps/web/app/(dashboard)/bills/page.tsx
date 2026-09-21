import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import BillsClient from '@/components/bills/BillsClient'

export default async function BillsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/signin')
  }

  const { data: bills } = await supabase
    .from('bills')
    .select('*')
    .eq('user_id', user.id)
    .order('next_due_at', { ascending: true })

  // Fetch payment history for each bill
  const billsWithPayments = await Promise.all(
    (bills || []).map(async (bill: any) => {
      const { data: payments } = await supabase
        .from('bill_payments')
        .select('*')
        .eq('bill_id', bill.id)
        .order('paid_at', { ascending: false })
        .limit(5)

      const now = new Date()
      const dueDate = new Date(bill.next_due_at)
      const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / 86400000)
      const isOverdue = daysUntilDue < 0
      const isDueSoon = daysUntilDue >= 0 && daysUntilDue <= bill.reminder_lead_days

      return {
        ...bill,
        payments: payments || [],
        daysUntilDue,
        isOverdue,
        isDueSoon,
        dueRule: bill.due_rule as any,
      }
    })
  )

  return <BillsClient bills={billsWithPayments} />
}
