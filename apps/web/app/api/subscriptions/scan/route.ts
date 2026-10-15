import { NextResponse } from 'next/server'
import { createClientFromRequest } from '@/lib/api/auth'
import { detectSubscriptions, getSubscriptions } from '@/lib/api/subscriptions'

export async function POST(req: Request) {
  const auth = await createClientFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const result = await detectSubscriptions(auth.supabase, auth.user.id)
    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
