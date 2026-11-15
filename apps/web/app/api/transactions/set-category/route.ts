import { NextResponse } from 'next/server'
import { createClientFromRequest } from '@/lib/api/auth'
import { setTransactionCategory } from '@/lib/api/transactions'

export async function POST(req: Request) {
  const auth = await createClientFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { id, categoryId } = body || {}

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const result = await setTransactionCategory(
      auth.supabase,
      auth.user.id,
      id,
      typeof categoryId === 'string' && categoryId ? categoryId : null
    )

    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 }
    )
  }
}
