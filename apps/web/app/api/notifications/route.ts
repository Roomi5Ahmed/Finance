import { NextResponse } from 'next/server'
import { createClientFromRequest } from '@/lib/api/auth'
import { getNotifications, getUnreadCount, markAsRead, markAllAsRead, deleteNotification } from '@/lib/api/notifications'

export async function GET(req: Request) {
  const auth = await createClientFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const url = new URL(req.url)
    const limit = parseInt(url.searchParams.get('limit') || '20')

    const notifications = await getNotifications(auth.supabase, auth.user.id, limit)
    const unreadCount = await getUnreadCount(auth.supabase, auth.user.id)
    return NextResponse.json({ notifications, unreadCount })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  const auth = await createClientFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()

    if (body.action === 'markAllRead') {
      const success = await markAllAsRead(auth.supabase, auth.user.id)
      return NextResponse.json({ success })
    }

    if (body.action === 'markRead' && body.id) {
      const success = await markAsRead(auth.supabase, auth.user.id, body.id)
      return NextResponse.json({ success })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  const auth = await createClientFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const url = new URL(req.url)
    const id = url.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const success = await deleteNotification(auth.supabase, auth.user.id, id)
    return NextResponse.json({ success })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
