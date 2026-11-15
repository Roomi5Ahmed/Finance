import { NextResponse } from 'next/server'
import { createClientFromRequest } from '@/lib/api/auth'
import { getAvailableMonths } from '@/lib/api/dashboard'

export async function GET(req: Request) {
  const auth = await createClientFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const months = await getAvailableMonths(auth.supabase, auth.user.id)
    return NextResponse.json({ months })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 }
    )
  }
}
