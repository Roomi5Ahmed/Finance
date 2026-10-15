import { NextResponse } from 'next/server'
import { createClientFromRequest } from '@/lib/api/auth'
import { registerDeviceToken } from '@/lib/push'

export async function POST(req: Request) {
  const auth = await createClientFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    if (!body.expoPushToken || !body.platform) {
      return NextResponse.json({ error: 'Missing expoPushToken or platform' }, { status: 400 })
    }

    const success = await registerDeviceToken(auth.supabase, auth.user.id, body.expoPushToken, body.platform)
    return NextResponse.json({ success })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
