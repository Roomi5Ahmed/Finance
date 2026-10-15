import { NextResponse } from 'next/server'
import { createClientFromRequest } from '@/lib/api/auth'
import { createBill, getBills } from '@/lib/api/bills'

export async function GET(req: Request) {
  const auth = await createClientFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const bills = await getBills(auth.supabase, auth.user.id)
    return NextResponse.json({ bills })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const auth = await createClientFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const result = await createBill(auth.supabase, auth.user.id, {
      name: body.name,
      amountEstimate: body.amountEstimate,
      recurrence: body.dueRule?.recurrence || body.recurrence,
      dayOfMonth: body.dueRule?.day_of_month || body.dayOfMonth,
      reminderLeadDays: body.reminderLeadDays,
    })
    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
