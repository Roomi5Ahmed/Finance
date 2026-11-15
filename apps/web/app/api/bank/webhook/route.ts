import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { runCategorisationPipeline } from '@/lib/categorisation/pipeline';

// Webhook receiver for Indian Bank Aggregator (e.g., Setu / Mock)
export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const expectedSecret = process.env.BANK_WEBHOOK_SECRET || 'dev_secret_123';

    if (authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { userId, accountId, transactions } = payload;

    if (!userId || !accountId || !transactions || !Array.isArray(transactions)) {
      return NextResponse.json({ error: 'Invalid payload schema' }, { status: 400 });
    }

    const userToken = req.headers.get('x-user-token');

    // Initialize Supabase client. 
    // In prod: Use Service Role Key to bypass RLS. 
    // In dev mock: Use the user's session token passed via header.
    let supabaseAdmin;
    if (userToken) {
      supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { global: { headers: { Authorization: `Bearer ${userToken}` } } }
      );
    } else {
      supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
    }

    // 1. Insert raw transactions
    const dbPayload = transactions.map((tx: any) => ({
      user_id: userId,
      account_id: accountId,
      amount: tx.amount,
      date: new Date(tx.date).toISOString(),
      merchant: tx.merchant,
      notes: tx.notes || 'Aggregator Sync',
      category_source: 'import',
    }));

    const { data: insertedTxs, error: insertError } = await supabaseAdmin
      .from('transactions')
      .insert(dbPayload)
      .select('id, merchant');

    if (insertError) {
      console.error('Webhook insert error:', insertError);
      return NextResponse.json({ error: 'Database insert failed' }, { status: 500 });
    }

    // 2. Run the shared 4-layer categorisation pipeline in the background
    // (same pipeline as CSV/PDF import and the Categorise button — respects
    // user-owned cache rules and flags low-confidence payees for review).
    runCategorisationPipeline(supabaseAdmin, userId).catch(err =>
      console.error('Background categorisation failed:', err)
    );

    return NextResponse.json({ success: true, inserted: insertedTxs?.length || 0 });

  } catch (err: any) {
    console.error('Webhook processing error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
