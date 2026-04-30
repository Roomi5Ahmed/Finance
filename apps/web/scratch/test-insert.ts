import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://pbxlgtjjjtaxqyizznxi.supabase.co'
const supabaseKey = 'sb_publishable_FuESLqjdHvPJji_hZoKUQA_Ox-QFWZA'

// Create a client with the anon key
const supabase = createClient(supabaseUrl, supabaseKey)

async function testInsert() {
  // Let's sign in a test user to get a valid session
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'test@example.com',
    password: 'password123'
  })

  if (error) {
    console.error("Auth error:", error)
    // If auth fails, try to insert anyway to see if RLS blocks it
  } else {
    console.log("Logged in:", data.user?.id)
  }

  const userId = data?.user?.id || '296068e1-5bc3-488f-b98f-0a06c5793012'; // Dummy or real

  const { error: insertError } = await supabase.from('transactions').insert({
    user_id: userId,
    account_id: '123e4567-e89b-12d3-a456-426614174000', // invalid uuid might throw fk constraint
    amount: -100,
    date: new Date().toISOString(),
    merchant: 'Test Script'
  })

  console.log("Insert Error:", insertError)
}

testInsert()
