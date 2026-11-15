import { NextResponse } from 'next/server'
import { createClientFromRequest } from '@/lib/api/auth'
import { getReviewGroups } from '@/lib/api/review'

export async function GET(req: Request) {
  const auth = await createClientFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const groups = await getReviewGroups(auth.supabase, auth.user.id)
    return NextResponse.json({
      groups,
      count: groups.reduce((sum, g) => sum + g.count, 0),
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 }
    )
  }
}
