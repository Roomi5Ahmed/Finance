import { NextResponse } from 'next/server'
import { createClientFromRequest } from '@/lib/api/auth'
import { createBudget, getBudgetsWithProgress } from '@/lib/api/budgets'

export async function GET(req: Request) {
  const auth = await createClientFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { budgets, totalMonthlySpend } = await getBudgetsWithProgress(auth.supabase, auth.user.id)
    return NextResponse.json({ budgets, totalMonthlySpend })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const auth = await createClientFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const result = await createBudget(auth.supabase, auth.user.id, {
      categoryId: body.categoryId || null,
      amount: parseFloat(body.amount),
      period: body.period,
      startDate: body.startDate,
      autoRenew: body.autoRenew,
      alertThresholds: body.alertThresholds,
    })
    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
