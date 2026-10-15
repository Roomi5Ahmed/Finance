import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkAndFireBillReminders } from '@/lib/api/bills'

// Daily cron job: fires bill reminder notifications for all users.
// Configure as a Vercel Cron Job hitting this route daily, or call manually.
// Protected by CRON_SECRET env var.
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET

  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Fetch all users who have active bills
    const { data: bills } = await supabase
      .from('bills')
      .select('user_id')
      .eq('status', 'active')

    const userIds = [...new Set((bills || []).map(b => b.user_id))]

    for (const userId of userIds) {
      await checkAndFireBillReminders(supabase, userId)
    }

    return NextResponse.json({ success: true, usersProcessed: userIds.length })
  } catch (err: any) {
    console.error('Bill reminder cron error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
