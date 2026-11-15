import { createClient } from '@/utils/supabase/server'
import TransactionsClient from './TransactionsClient'
import { getCategories } from './actions'
import { getReviewGroups } from '@/lib/api/review'

export default async function TransactionsPage() {
  const supabase = await createClient()
  
  // Get user
  const { data: { user } } = await supabase.auth.getUser()
  
  // Fetch transactions
  const { data: transactions } = await supabase
    .from('transactions')
    .select('*, categories(*)')
    .eq('user_id', user?.id)
    .order('date', { ascending: false })
    .limit(50)

  // Fetch categories
  const categories = await getCategories()

  // Payee groups waiting in the review queue (PRD 4.4)
  const reviewGroups = user ? await getReviewGroups(supabase, user.id) : []

  return (
    <TransactionsClient 
      initialTransactions={transactions || []} 
      categories={categories || []} 
      initialReviewGroups={reviewGroups}
    />
  )
}
