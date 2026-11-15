import { NextResponse } from 'next/server'
import { createClientFromRequest } from '@/lib/api/auth'
import { getTrends } from '@/lib/api/dashboard'

export async function GET(req: Request) {
  const auth = await createClientFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const raw = new URL(req.url).searchParams.get('months')
    let months = 6
    if (raw !== null) {
      const parsed = Number(raw)
      if (!Number.isFinite(parsed) || parsed < 1 || parsed > 12) {
        return NextResponse.json({ error: 'months must be between 1 and 12' }, { status: 400 })
      }
      months = Math.round(parsed)
    }
    const data = await getTrends(auth.supabase, auth.user.id, months)
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 }
    )
  }
}
