'use server'

import { createClient } from '@/utils/supabase/server'
import { generateCategoryInsights as generateInsightsLib, CategoryInsightContext } from '@/lib/api/insights'

export async function generateCategoryInsights(ctx: CategoryInsightContext) {
  const supabase = await createClient()

  const { data: { session }, error } = await supabase.auth.getSession()
  const user = session?.user
  if (!user) throw new Error("Not authenticated: " + (error?.message || 'No session found'))

  return generateInsightsLib(supabase, ctx)
}
