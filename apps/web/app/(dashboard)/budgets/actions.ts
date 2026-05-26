'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateBudgetProfile(formData: FormData) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  const monthly_income = formData.get('monthly_income')
  const monthly_budget = formData.get('monthly_budget')

  const updates: any = {}
  if (monthly_income) updates.monthly_income = parseFloat(monthly_income as string)
  if (monthly_budget) updates.monthly_budget = parseFloat(monthly_budget as string)

  const { error } = await supabase
    .from('user_profiles')
    .upsert({ id: user.id, ...updates })

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/dashboard')
  revalidatePath('/budgets')

  return { success: true, message: 'Budget updated successfully!' }
}
