import { NextResponse } from 'next/server'
import { createClientFromRequest } from '@/lib/api/auth'
import { currentMonthKey, getDashboardMonth, monthRange } from '@/lib/api/dashboard'

export async function GET(req: Request) {
  const auth = await createClientFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const month = new URL(req.url).searchParams.get('month')
    if (month && !monthRange(month)) {
      return NextResponse.json({ error: 'month must be YYYY-MM' }, { status: 400 })
    }
    const data = await getDashboardMonth(auth.supabase, auth.user.id, month || currentMonthKey())
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 }
    )
  }
}
