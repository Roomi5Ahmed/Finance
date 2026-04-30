import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { categorizeMerchantsWithGemini } from '@/utils/gemini';

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
    }));

    const { data: insertedTxs, error: insertError } = await supabaseAdmin
      .from('transactions')
      .insert(dbPayload)
      .select('id, merchant');

    if (insertError) {
      console.error('Webhook insert error:', insertError);
      return NextResponse.json({ error: 'Database insert failed' }, { status: 500 });
    }

    // 2. Trigger Auto-Categorisation in the background (fire and forget)
    // In a real prod app, you might queue this via Inngest or similar.
    autoCategorizeWebhookData(supabaseAdmin, userId, insertedTxs || []);

    return NextResponse.json({ success: true, inserted: insertedTxs?.length || 0 });

  } catch (err: any) {
    console.error('Webhook processing error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// Background categorisation helper
async function autoCategorizeWebhookData(supabaseAdmin: any, userId: string, newTxs: any[]) {
  if (newTxs.length === 0) return;

  try {
    // Fetch categories
    const { data: categories } = await supabaseAdmin.from('categories').select('*');
    if (!categories) return;

    // Fetch user cache
    const { data: cache } = await supabaseAdmin
      .from('merchant_category_cache')
      .select('merchant_name, category_id')
      .eq('user_id', userId);

    const cacheMap = new Map((cache || []).map((c: any) => [c.merchant_name.toLowerCase(), c.category_id]));
    const toUpdate: { id: string, category_id: string }[] = [];
    const uniqueUnknownMerchants = new Set<string>();

    for (const tx of newTxs) {
      const merchantLower = tx.merchant.toLowerCase();
      if (cacheMap.has(merchantLower)) {
        toUpdate.push({ id: tx.id, category_id: cacheMap.get(merchantLower) as string });
      } else {
        uniqueUnknownMerchants.add(tx.merchant);
      }
    }

    if (uniqueUnknownMerchants.size > 0) {
      const merchantsArray = Array.from(uniqueUnknownMerchants);
      const geminiResults = await categorizeMerchantsWithGemini(merchantsArray, categories);
      const newCacheEntries = [];
      
      for (const [merchant, categoryId] of Object.entries(geminiResults)) {
        if (!categoryId || !categoryId.includes('-')) continue; 
        
        newCacheEntries.push({ user_id: userId, merchant_name: merchant, category_id: categoryId });

        for (const tx of newTxs) {
          if (tx.merchant === merchant) {
            toUpdate.push({ id: tx.id, category_id: categoryId });
          }
        }
      }

      if (newCacheEntries.length > 0) {
        await supabaseAdmin.from('merchant_category_cache').upsert(newCacheEntries, { onConflict: 'user_id, merchant_name' });
      }
    }

    if (toUpdate.length > 0) {
      for (const update of toUpdate) {
        await supabaseAdmin.from('transactions').update({ category_id: update.category_id }).eq('id', update.id);
      }
    }
    console.log(`Webhook auto-categorised ${toUpdate.length} transactions for user ${userId}`);
  } catch (err) {
    console.error('Background categorisation failed:', err);
  }
}
