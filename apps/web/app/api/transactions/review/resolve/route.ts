import { NextResponse } from 'next/server'
import { createClientFromRequest } from '@/lib/api/auth'
import { resolveReviewGroup } from '@/lib/api/review'

export async function POST(req: Request) {
  const auth = await createClientFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { payee, categoryId, applyToAll, label, txnId } = body || {}

    if (!payee || typeof payee !== 'string') {
      return NextResponse.json({ error: 'payee is required' }, { status: 400 })
    }
    if (!categoryId || typeof categoryId !== 'string') {
      return NextResponse.json({ error: 'categoryId is required' }, { status: 400 })
    }

    const result = await resolveReviewGroup(auth.supabase, auth.user.id, {
      payee,
      categoryId,
      applyToAll: applyToAll !== false,
      label: typeof label === 'string' ? label : null,
      txnId: typeof txnId === 'string' ? txnId : undefined,
    })

    return NextResponse.json({ updated: result.updated })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 }
    )
  }
}
