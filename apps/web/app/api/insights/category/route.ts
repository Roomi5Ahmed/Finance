import { NextResponse } from 'next/server'
import { createClientFromRequest } from '@/lib/api/auth'
import { generateCategoryInsights, CategoryInsightContext } from '@/lib/api/insights'

export async function POST(req: Request) {
  const auth = await createClientFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()

    if (!body.context) {
      return NextResponse.json({ error: 'Missing context' }, { status: 400 })
    }

    const month = typeof body.month === 'string' ? body.month : undefined
    const tips = await generateCategoryInsights(auth.supabase, body.context as CategoryInsightContext, {
      userId: auth.user.id,
      month,
    })
    return NextResponse.json({ tips })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 }
    )
  }
}
