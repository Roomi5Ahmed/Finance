'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import * as txLib from '@/lib/api/transactions'

export async function addTransaction(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const type = formData.get('type') as string
  let amount = parseFloat(formData.get('amount') as string)
  if (type === 'expense') amount = -Math.abs(amount)
  else if (type === 'income') amount = Math.abs(amount)

  const rawTags = formData.get('tags') as string
  const tags = rawTags ? rawTags.split(',').map(t => t.trim().replace(/^#/, '')) : []

  await txLib.addTransaction(supabase, user.id, {
    amount,
    date: formData.get('date') as string,
    merchant: formData.get('merchant') as string,
    categoryId: (formData.get('category_id') as string) || null,
    tags,
  })

  revalidatePath('/transactions')
  revalidatePath('/dashboard')
}

export async function bulkAddTransactions(transactions: any[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  await txLib.bulkAddTransactions(supabase, user.id, transactions)

  revalidatePath('/transactions')
  revalidatePath('/dashboard')
}

export async function getCategories() {
  const supabase = await createClient()
  return txLib.getCategories(supabase)
}

export async function autoCategoriseTransactions() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const result = await txLib.autoCategoriseTransactions(supabase, user.id)

  revalidatePath('/transactions')
  revalidatePath('/dashboard')
  return result
}

export async function triggerMockWebhook() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const result = await txLib.triggerMockWebhook(supabase, user.id)

  revalidatePath('/transactions')
  revalidatePath('/dashboard')
  return result
}
