import { createClient } from '@/utils/supabase/server'
import TransactionsClient from './TransactionsClient'
import { getCategories } from './actions'

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

  return (
    <TransactionsClient 
      initialTransactions={transactions || []} 
      categories={categories || []} 
    />
  )
}
