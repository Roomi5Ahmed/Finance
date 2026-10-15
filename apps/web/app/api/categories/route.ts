import { NextResponse } from 'next/server'
import { createClientFromRequest } from '@/lib/api/auth'
import { getCategories } from '@/lib/api/transactions'

export async function GET(req: Request) {
  const auth = await createClientFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const categories = await getCategories(auth.supabase)
    return NextResponse.json({ categories })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
