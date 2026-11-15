'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import * as txLib from '@/lib/api/transactions'
import * as reviewLib from '@/lib/api/review'

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

  const result = await txLib.bulkAddTransactions(supabase, user.id, transactions)

  revalidatePath('/transactions')
  revalidatePath('/dashboard')
  return result
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

export async function fetchReviewGroups() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  return reviewLib.getReviewGroups(supabase, user.id)
}

export async function resolveReviewGroup(input: reviewLib.ResolveReviewInput) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const result = await reviewLib.resolveReviewGroup(supabase, user.id, input)

  revalidatePath('/transactions')
  revalidatePath('/dashboard')
  return result
}

/** Single-transaction category change; returns the payee + sibling count for
 *  the "Apply to all transactions from this payee?" offer (PRD 4.5). */
export async function setTransactionCategory(txnId: string, categoryId: string | null) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const result = await txLib.setTransactionCategory(supabase, user.id, txnId, categoryId)

  revalidatePath('/transactions')
  revalidatePath('/dashboard')
  return result
}

export async function fetchPayeeTransactions(payee: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  return reviewLib.getPayeeTransactions(supabase, user.id, payee)
}
