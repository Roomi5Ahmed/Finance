-- Smart Finance Tracker: Database Schema & RLS Policies

-- 1. Create Tables

-- User Profiles table (extends auth.users)
CREATE TABLE public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    currency TEXT NOT NULL DEFAULT 'INR',
    monthly_income DECIMAL(12,2),
    monthly_budget DECIMAL(12,2) DEFAULT 50000.00,
    financial_goal TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Accounts table (Bank accounts, Cash, Credit Cards)
CREATE TABLE public.accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- e.g., 'BANK', 'CREDIT_CARD', 'CASH'
    balance DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Categories table
CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL means global default category
    name TEXT NOT NULL,
    icon TEXT,
    color TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Transactions table
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    amount DECIMAL(12,2) NOT NULL,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    merchant TEXT,
    notes TEXT,
    is_recurring BOOLEAN DEFAULT FALSE,
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 2. Insert Default Categories
-- These have user_id = NULL so they are available to everyone
INSERT INTO public.categories (name, icon, color) VALUES
    ('Housing', '🏠', '#ef4444'),
    ('Food & Dining', '🍔', '#f97316'),
    ('Transportation', '🚗', '#eab308'),
    ('Utilities', '💡', '#22c55e'),
    ('Subscriptions & Software', '💻', '#3b82f6'),
    ('Entertainment', '🎬', '#8b5cf6'),
    ('Debt & Savings', '🏦', '#ec4899'),
    ('Income', '💰', '#10b981')
ON CONFLICT DO NOTHING;

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies

-- User Profiles: Users can only see and update their own profile
CREATE POLICY "Users can view own profile" ON public.user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.user_profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.user_profiles FOR UPDATE USING (auth.uid() = id);

-- Accounts: Users can only see and manage their own accounts
CREATE POLICY "Users can view own accounts" ON public.accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own accounts" ON public.accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own accounts" ON public.accounts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own accounts" ON public.accounts FOR DELETE USING (auth.uid() = user_id);

-- Categories: Users can view global defaults (user_id IS NULL) + their own custom categories
CREATE POLICY "Users can view global and own categories" ON public.categories FOR SELECT USING (user_id IS NULL OR auth.uid() = user_id);
CREATE POLICY "Users can insert own custom categories" ON public.categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own custom categories" ON public.categories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own custom categories" ON public.categories FOR DELETE USING (auth.uid() = user_id);

-- Transactions: Users can only see and manage their own transactions
CREATE POLICY "Users can view own transactions" ON public.transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own transactions" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own transactions" ON public.transactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own transactions" ON public.transactions FOR DELETE USING (auth.uid() = user_id);

-- 5. Create a trigger to automatically create a user_profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id)
  VALUES (new.id);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 6. AI Categorisation Cache
CREATE TABLE public.merchant_category_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    merchant_name TEXT NOT NULL,
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    confidence DECIMAL(3,2) DEFAULT 1.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    UNIQUE(user_id, merchant_name)
);

ALTER TABLE public.merchant_category_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own cache" ON public.merchant_category_cache FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- PHASE 1 FEATURES
-- ============================================================================

-- 7. Budgets (F2) — Category-level or overall monthly/weekly budgets
CREATE TABLE public.budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE, -- NULL = overall budget
    amount DECIMAL(12,2) NOT NULL,
    period TEXT NOT NULL DEFAULT 'monthly' CHECK (period IN ('weekly', 'monthly')),
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    auto_renew BOOLEAN DEFAULT TRUE,
    alert_thresholds INT[] DEFAULT ARRAY[80, 100],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    UNIQUE(user_id, category_id, period)
);

ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own budgets" ON public.budgets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own budgets" ON public.budgets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own budgets" ON public.budgets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own budgets" ON public.budgets FOR DELETE USING (auth.uid() = user_id);

-- 8. Budget Alerts Sent (F2) — Deduplication for threshold notifications
CREATE TABLE public.budget_alerts_sent (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    budget_id UUID NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    threshold INT NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    UNIQUE(budget_id, period_start, threshold)
);

ALTER TABLE public.budget_alerts_sent ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own budget alerts" ON public.budget_alerts_sent FOR ALL
    USING (auth.uid() = (SELECT user_id FROM public.budgets WHERE id = budget_id))
    WITH CHECK (auth.uid() = (SELECT user_id FROM public.budgets WHERE id = budget_id));

-- 9. Subscriptions (F1) — Auto-detected recurring payments
CREATE TABLE public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    merchant_normalized TEXT NOT NULL,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    avg_amount DECIMAL(12,2) NOT NULL,
    cadence TEXT NOT NULL CHECK (cadence IN ('weekly', 'monthly', 'quarterly', 'annual')),
    first_seen_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_charged_at TIMESTAMP WITH TIME ZONE NOT NULL,
    next_expected_at TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL DEFAULT 'candidate' CHECK (status IN ('candidate', 'active', 'lapsed', 'cancelled_by_user', 'not_recurring')),
    price_history JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    UNIQUE(user_id, merchant_normalized)
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own subscriptions" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own subscriptions" ON public.subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own subscriptions" ON public.subscriptions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own subscriptions" ON public.subscriptions FOR DELETE USING (auth.uid() = user_id);

-- Add subscription FK to transactions
ALTER TABLE public.transactions ADD COLUMN subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL;

-- 10. Bills (F4) — Manual bill reminders
CREATE TABLE public.bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    amount_estimate DECIMAL(12,2),
    due_rule JSONB NOT NULL DEFAULT '{"recurrence": "monthly", "day_of_month": 1}'::jsonb,
    next_due_at TIMESTAMP WITH TIME ZONE NOT NULL,
    reminder_lead_days INT DEFAULT 3,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'paid')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own bills" ON public.bills FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own bills" ON public.bills FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own bills" ON public.bills FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own bills" ON public.bills FOR DELETE USING (auth.uid() = user_id);

-- 11. Bill Payments (F4) — Payment history and reconciliation
CREATE TABLE public.bill_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
    paid_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    matched_transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

ALTER TABLE public.bill_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own bill payments" ON public.bill_payments FOR ALL
    USING (auth.uid() = (SELECT user_id FROM public.bills WHERE id = bill_id))
    WITH CHECK (auth.uid() = (SELECT user_id FROM public.bills WHERE id = bill_id));

-- 12. Notifications — Shared pipeline for budget/bill/subscription alerts
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('budget_alert', 'bill_reminder', 'subscription_price_change', 'subscription_detected', 'info')),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    data JSONB DEFAULT '{}'::jsonb,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own notifications" ON public.notifications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notifications" ON public.notifications FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- MOBILE APP SUPPORT
-- ============================================================================

-- 13. Device Tokens — for Expo push notifications
CREATE TABLE public.device_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    expo_push_token TEXT NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    UNIQUE(user_id, expo_push_token)
);

ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own device tokens" ON public.device_tokens FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- PERSONAL PAYEE CATEGORISATION (PRD_Personal_Payee_Categorisation.md)
-- Idempotent: safe to run on an existing database (fresh installs get this
-- automatically as part of this file; existing databases should run only
-- this section in the Supabase SQL editor).
-- ============================================================================

-- 14. Categorisation provenance + review queue columns
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS category_source TEXT
    CHECK (category_source IN ('user','rule','ai','import')),
  ADD COLUMN IF NOT EXISTS category_confidence NUMERIC(3,2),
  ADD COLUMN IF NOT EXISTS needs_review BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS payee_type TEXT
    CHECK (payee_type IN ('business','person','unknown')) DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS txn_time TIME;

-- Who set the cached category (AI must never overwrite source='user' rows)
-- Base table may predate this section on older databases — create it if missing.
CREATE TABLE IF NOT EXISTS public.merchant_category_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    merchant_name TEXT NOT NULL,
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    confidence DECIMAL(3,2) DEFAULT 1.00,
    source TEXT NOT NULL DEFAULT 'ai'
      CHECK (source IN ('user','rule','ai')),
    payee_type TEXT DEFAULT 'unknown',
    label TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    UNIQUE(user_id, merchant_name)
);

ALTER TABLE public.merchant_category_cache ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'merchant_category_cache'
      AND policyname = 'Users can manage own cache'
  ) THEN
    CREATE POLICY "Users can manage own cache" ON public.merchant_category_cache
      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

ALTER TABLE public.merchant_category_cache
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'ai'
    CHECK (source IN ('user','rule','ai')),
  ADD COLUMN IF NOT EXISTS payee_type TEXT DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS label TEXT;

CREATE INDEX IF NOT EXISTS tx_review_idx
  ON public.transactions(user_id) WHERE needs_review = TRUE;

-- 15. Fallback category for person-to-person payments with no better answer
INSERT INTO public.categories (name, icon, color)
SELECT 'Personal Transfers', '⇄', '#0d9488'
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories
  WHERE user_id IS NULL AND lower(name) = 'personal transfers'
);

-- ============================================================================
-- PAST-MONTH DASHBOARD AND ANALYSIS (PRD_Historical_Month_Dashboard.md)
-- Idempotent: safe to run on an existing database.
-- ============================================================================

-- 16. Server-side month aggregation (security invoker: RLS applies).
-- Date ranges are half-open and converted from local calendar dates in p_tz
-- (default Asia/Kolkata) so month boundaries follow the user's clock.

CREATE OR REPLACE FUNCTION public.monthly_summary(
  p_user UUID, p_start DATE, p_end DATE, p_tz TEXT DEFAULT 'Asia/Kolkata'
)
RETURNS TABLE (month DATE, income NUMERIC, expenses NUMERIC, txn_count INT)
LANGUAGE sql STABLE AS $$
  SELECT date_trunc('month', date AT TIME ZONE p_tz)::date,
         COALESCE(sum(amount) FILTER (WHERE amount > 0), 0),
         COALESCE(-sum(amount) FILTER (WHERE amount < 0), 0),
         count(*)::int
  FROM public.transactions
  WHERE user_id = p_user
    AND date >= (p_start::timestamp AT TIME ZONE p_tz)
    AND date <  (p_end::timestamp AT TIME ZONE p_tz)
  GROUP BY 1
  ORDER BY 1;
$$;

CREATE OR REPLACE FUNCTION public.category_summary(
  p_user UUID, p_start DATE, p_end DATE, p_tz TEXT DEFAULT 'Asia/Kolkata'
)
RETURNS TABLE (category_id UUID, spent NUMERIC, txn_count INT)
LANGUAGE sql STABLE AS $$
  SELECT category_id, -sum(amount), count(*)::int
  FROM public.transactions
  WHERE user_id = p_user AND amount < 0
    AND date >= (p_start::timestamp AT TIME ZONE p_tz)
    AND date <  (p_end::timestamp AT TIME ZONE p_tz)
  GROUP BY category_id;
$$;

CREATE OR REPLACE FUNCTION public.monthly_category_summary(
  p_user UUID, p_start DATE, p_end DATE, p_tz TEXT DEFAULT 'Asia/Kolkata'
)
RETURNS TABLE (month DATE, category_id UUID, spent NUMERIC)
LANGUAGE sql STABLE AS $$
  SELECT date_trunc('month', date AT TIME ZONE p_tz)::date,
         category_id, -sum(amount)
  FROM public.transactions
  WHERE user_id = p_user AND amount < 0
    AND date >= (p_start::timestamp AT TIME ZONE p_tz)
    AND date <  (p_end::timestamp AT TIME ZONE p_tz)
  GROUP BY 1, 2
  ORDER BY 1;
$$;

CREATE INDEX IF NOT EXISTS transactions_user_date_idx
  ON public.transactions(user_id, date DESC);

-- 17. AI tips cache for immutable past months (key: user + category + month)
CREATE TABLE IF NOT EXISTS public.ai_tips_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category_name TEXT NOT NULL,
    month DATE NOT NULL,
    tips JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    UNIQUE(user_id, category_name, month)
);

ALTER TABLE public.ai_tips_cache ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ai_tips_cache'
      AND policyname = 'Users can manage own tips'
  ) THEN
    CREATE POLICY "Users can manage own tips" ON public.ai_tips_cache
      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
