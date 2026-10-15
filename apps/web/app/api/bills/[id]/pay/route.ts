import { NextResponse } from 'next/server'
import { createClientFromRequest } from '@/lib/api/auth'
import { markBillAsPaid } from '@/lib/api/bills'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await createClientFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await params
    const result = await markBillAsPaid(auth.supabase, auth.user.id, id)
    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
