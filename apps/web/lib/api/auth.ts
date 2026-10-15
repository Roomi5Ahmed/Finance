import { createClient } from '@supabase/supabase-js'

export async function createClientFromRequest(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null

  const token = authHeader.slice(7)

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null

  return { supabase, user }
}
