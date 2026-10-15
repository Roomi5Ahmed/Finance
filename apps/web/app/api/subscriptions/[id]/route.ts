import { NextResponse } from 'next/server'
import { createClientFromRequest } from '@/lib/api/auth'
import { updateSubscriptionStatus, deleteSubscription } from '@/lib/api/subscriptions'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await createClientFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await params
    const body = await req.json()

    if (body.status === 'delete') {
      const result = await deleteSubscription(auth.supabase, auth.user.id, id)
      return NextResponse.json(result)
    }

    const result = await updateSubscriptionStatus(auth.supabase, auth.user.id, id, body.status)
    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
