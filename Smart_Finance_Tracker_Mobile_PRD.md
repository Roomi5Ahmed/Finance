# Smart Finance Tracker — Mobile App PRD
## For implementation by a coding agent

**Version:** 1.0
**Date:** October 15, 2026
**Source repo (web):** github.com/Roomi5Ahmed/Finance
**Target:** New Expo (React Native) app, backed by the same Supabase project, calling a new decoupled API layer added to the existing Next.js app.

---

## 1. Executive Summary

Smart Finance Tracker is a working web app (Next.js + Supabase + Gemini) with these features already built and verified: AI transaction categorization, AI per-category insights, bank-sync simulation (mock Account Aggregator webhook), CSV statement import, manual transaction entry, budgets with threshold alerts, bill reminders, automatic recurring-subscription detection, an in-app notification bell, and a 3-step onboarding flow.

This PRD defines the work to build a **native iOS/Android app in React Native (Expo)** that reproduces every one of these features natively, backed by the **same Supabase project and database** — no data migration needed — via a **new HTTP API layer** that replaces the web app's Next.js Server Actions as the integration point.

This is two workstreams, done in order:
1. **Backend decoupling** — convert existing Server Actions into callable API routes (done inside the existing Next.js repo; the web app keeps working throughout).
2. **Mobile app build** — a new Expo app that calls those routes.

---

## 2. Objectives & Success Criteria

- Every feature listed in Section 1 works end-to-end on a physical/simulated iOS and Android device, with no feature regressions relative to web.
- The mobile app authenticates against the same Supabase Auth user pool — a user can sign in on web and mobile with the same credentials and see the same data.
- No business logic is duplicated between web and mobile — both clients call the same API routes.
- No secrets (Gemini API key, Supabase service role key) are ever embedded in the mobile app bundle.
- Push notifications are delivered for the same three alert types already modeled in-app: budget threshold crossed, subscription price change, bill due reminder.
- App builds successfully via EAS Build for both platforms and installs on a physical device via TestFlight / Play Internal Testing.

### Out of Scope for this PRD
- App Store / Play Store public submission and review (build + internal testing only).
- Shared/family accounts, PDF/CSV export, receipt scanning (these were P1/P2 items in the original feature PRD and are not required for mobile parity — add only if time allows after Section 10's phases are complete).
- Any change to the Supabase schema beyond what's listed in Section 5 — this PRD assumes the existing schema from the web app's feature build is already in place.
- Email/SMS-based transaction ingestion — out of scope; bank sync remains the mock-webhook simulation already built on web.

---

## 3. Current System Reference

**Web stack:** Next.js (App Router), TypeScript, Supabase (Postgres + Auth + Row Level Security), Google Gemini 2.5 Flash for AI categorization/insights, Recharts for charts, Tailwind CSS.

**Existing web routes (by folder), each with Server Actions in `actions.ts`:**

| Route | Purpose | Key Server Actions |
|---|---|---|
| `/dashboard` | KPIs, charts, budget ring, subscriptions/bills widgets | (reads only, no actions) |
| `/transactions` | List, add, import, sync, categorize | `triggerMockWebhook`, `autoCategorise`, `getCategories`, create/CSV-import actions |
| `/insights` | Per-category AI tips | `generateCategoryInsights` |
| `/budgets` | Budget CRUD, threshold alerts | `createBudget` (+ list/update/delete) |
| `/subscriptions` | Detect & manage recurring charges | `detectSubscriptions` (+ status update actions) |
| `/bills` | Bill CRUD, mark-paid | `createBill`, `markBillPaid` |

**Known UI/navigation detail:** The web sidebar also lists "Accounts" and "Settings" — these have **no implementation** behind them. Do not port these as functional screens; a placeholder "Coming soon" screen is acceptable if the nav item is kept for visual parity, but no backend work is needed for them in this PRD.

**Onboarding:** 3-step modal on first login — currency selection, monthly income (optional), primary goal (Save money / Reduce subscriptions / Track spending / Debt paydown). Must be ported as native screens, gating first-time dashboard access the same way.

---

## 4. Target Architecture

```
┌─────────────────────┐         ┌──────────────────────────┐
│  Expo React Native   │  HTTPS  │  Next.js app (existing)   │
│  app (iOS/Android)   │ ──────► │  /app/api/**/route.ts     │
│                       │ JWT    │  (new route handlers,     │
│  - expo-router       │  auth  │   wrapping existing logic) │
│  - NativeWind         │        │                           │
│  - supabase-js        │        │  - Gemini calls stay here │
│  - expo-notifications │        │  - Server-side Supabase   │
└──────────┬────────────┘        │    client (service logic, │
           │                     │    still scoped by RLS)   │
           │ direct (read/write, │                           │
           │ RLS-protected)      └─────────────┬─────────────┘
           ▼                                   ▼
┌──────────────────────────────────────────────────────────┐
│                  Supabase (shared project)                │
│  Postgres + Row Level Security + Auth + Realtime           │
└──────────────────────────────────────────────────────────┘
```

**Two valid data paths from mobile, used for different purposes:**
1. **Direct Supabase client calls** (via `@supabase/supabase-js` in the RN app, authenticated with the user's session) for simple reads/writes that don't need server-side logic — e.g., fetching the transaction list, fetching budgets. RLS policies already scope these correctly; no new backend work needed for plain CRUD reads.
2. **API route calls** (via `fetch` to the Next.js app's new route handlers) for anything that currently requires server-side logic — Gemini calls, the mock webhook, subscription-detection clustering, threshold-alert evaluation. These **must** go through the API layer, never be reimplemented in the mobile app.

**Rule of thumb for the agent:** if the web app's version of this feature is a Server Action, build an API route for it and call that from mobile. If it's a direct Supabase query in a Server Component, call Supabase directly from the mobile app the same way.

---

## 5. Data Model Reference (no changes required — for context only)

These tables already exist in Supabase from the web build; mobile reads/writes the same tables.

```
transactions(id, user_id, date, merchant, amount, category_id, subscription_id, flag_type, flag_status, created_at)
categories(id, name, icon, color)
subscriptions(id, user_id, merchant_normalized, category_id, avg_amount, cadence, first_seen_at, last_charged_at, next_expected_at, status, price_history jsonb)
budgets(id, user_id, category_id, amount, period, start_date, auto_renew, alert_thresholds int[])
budget_alerts_sent(id, budget_id, period_start, threshold, sent_at)
bills(id, user_id, name, amount_estimate, due_rule jsonb, next_due_at, reminder_lead_days, status)
bill_payments(id, bill_id, paid_at, amount, matched_transaction_id)
```

If any of these differ from what's actually in the Supabase project, **the agent should read the live schema first** (via Supabase dashboard or `supabase gen types typescript`) and treat this list as a reference, not ground truth.

---

## 6. API Contract — New Route Handlers to Build in the Next.js App

All routes live under `app/api/` in the existing Next.js repo. All require a valid Supabase session JWT in the `Authorization: Bearer <token>` header; each handler creates a server-side Supabase client scoped to that user (RLS still applies — these routes do not use the service role key for anything user-scoped).

| Method & Path | Replaces (web Server Action) | Request Body | Response |
|---|---|---|---|
| `POST /api/transactions/sync` | `triggerMockWebhook` | `{}` | `{ inserted: Transaction[] }` |
| `POST /api/transactions/categorise` | `autoCategorise` | `{ transactionIds?: string[] }` (omit = all uncategorized) | `{ updated: Transaction[] }` |
| `GET /api/categories` | `getCategories` | — | `{ categories: Category[] }` |
| `POST /api/budgets` | `createBudget` | `{ categoryId, amount, period, startDate, autoRenew, alertThresholds }` | `{ budget: Budget }` |
| `GET /api/budgets` | (dashboard read) | — | `{ budgets: BudgetWithProgress[] }` |
| `POST /api/subscriptions/scan` | `detectSubscriptions` | `{}` | `{ subscriptions: Subscription[] }` |
| `PATCH /api/subscriptions/:id` | status-update action | `{ status: 'active'\|'cancelled'\|'not_recurring' }` | `{ subscription: Subscription }` |
| `POST /api/bills` | `createBill` | `{ name, amountEstimate, dueRule, reminderLeadDays }` | `{ bill: Bill }` |
| `POST /api/bills/:id/pay` | `markBillPaid` | `{ amount? }` | `{ bill: Bill, payment: BillPayment }` |
| `POST /api/insights/category` | `generateCategoryInsights` | `{ categoryId }` | `{ tips: string[] }` |
| `POST /api/notifications/register-device` | *(new — mobile only)* | `{ expoPushToken: string, platform: 'ios'\|'android' }` | `{ success: true }` |

**Agent task for each route:** move the existing Server Action's logic into the route handler body with minimal changes (same Supabase queries, same Gemini prompt calls), add the Bearer-token auth check at the top, and **keep the Server Action in place calling the new route internally** (or leave it calling the same extracted helper function) so the web app has zero behavior change. Do not duplicate logic — extract shared logic into a `lib/` helper function that both the Server Action and the new route handler call.

---

## 7. New Backend Work: Device Registration & Push Dispatch

This does not exist on web and must be built from scratch:

1. **`device_tokens` table (new):** `(id, user_id, expo_push_token, platform, created_at)` — one row per device a user has logged in on.
2. **`POST /api/notifications/register-device`** (Section 6) — called by the mobile app once after login/onboarding and on every app foreground, to keep the token fresh.
3. **Dispatch logic:** wherever the existing web code currently creates an in-app notification row (budget threshold crossed, subscription price change detected, bill reminder due), add a call to **Expo's push notification API** (`https://exp.host/--/api/v2/push/send`) sending to every registered `expo_push_token` for that `user_id`. This can be a single shared helper function (`lib/notifications/push.ts`) called from the budget-threshold check, the subscription-scan price-change check, and a new scheduled job for bill reminders (see Section 8).

---

## 8. New Backend Work: Bill Reminder Scheduling

On web, bill reminders are presumably only ever evaluated when a user has the Bills page open. For mobile, reminders need to fire even when the app isn't open. Build a scheduled job:

- A Supabase Edge Function (or a Vercel Cron Job calling an API route) running **daily**, querying all `bills` where `next_due_at - reminder_lead_days = today`, and triggering the push-notification helper from Section 7 for each matching user.
- This is additive — it doesn't change any existing bill logic, it just adds the "fire even when app is closed" capability mobile requires.

---

## 9. Mobile App Specification

### 9.1 Stack
- Expo (managed workflow), TypeScript, `expo-router` for file-based navigation
- `@supabase/supabase-js` + `expo-secure-store` for session storage, PKCE auth flow
- `NativeWind` for styling, matching the existing web app's dark theme, color palette, and spacing scale
- `react-native-gifted-charts` (or `victory-native`) for all charts — Recharts does not run in React Native
- `expo-document-picker` for CSV import
- `expo-notifications` for push, tied to the device-registration endpoint in Section 7

### 9.2 Navigation Structure
Bottom tab bar, matching the web sidebar's working items only (exclude Accounts/Settings unless built as placeholders):
`Dashboard | Transactions | Insights | Budgets | Subscriptions | Bills`

### 9.3 Screens

**Auth & Onboarding**
- Sign In / Sign Up screens (email/password, matching Supabase Auth config already in use)
- Onboarding flow: 3 steps (currency, income, goal) + skip option, gating first dashboard visit — mirrors `OnboardingModal.tsx` logic exactly

**Dashboard**
- Balance, income/expense KPIs, monthly budget ring
- 7-day spend trend chart, top-categories bar chart (charting library per 9.1)
- Subscriptions widget (top N active subscriptions by cost)
- Upcoming Bills widget (next N bills by due date)
- Pull-to-refresh on all data

**Transactions**
- List (paginated/infinite-scroll), newest first
- "Sync Bank" button → `POST /api/transactions/sync`
- "Auto Categorise" button → `POST /api/transactions/categorise`
- "Import CSV" → `expo-document-picker` + existing CSV-parsing logic ported to a route handler if not already isolated from the UI layer
- "Add Transaction" modal → direct Supabase insert (RLS-protected) — no Gemini involvement needed here, matches web behavior for manual entries

**Insights**
- Category cards (icon, spend, mini trend chart) matching `CategoryInsightCard.tsx`
- "Generate Optimizations" per card → `POST /api/insights/category`

**Budgets**
- List with progress bars, color-coded by % used
- "+ Add Budget" → `POST /api/budgets`
- Historical view of past period performance (reads only)

**Subscriptions**
- List, sorted by amount, total monthly/annual cost header
- "Scan" button → `POST /api/subscriptions/scan`
- Per-item status actions (cancel / not recurring) → `PATCH /api/subscriptions/:id`

**Bills**
- List, sorted by next due date
- "+ Add Bill" → `POST /api/bills`
- "Mark Paid" per item → `POST /api/bills/:id/pay`

**Notifications**
- Native push notifications (Section 7) for budget/subscription/bill alerts
- In-app notification center screen, mirroring the web notification bell's list + "mark all read"

---

## 10. Phased Implementation Plan

Each phase should be independently demo-able and should not break the previous phase. The coding agent should treat each phase as a checklist and confirm every item before moving to the next phase.

### Phase 0 — Backend Decoupling (in the existing Next.js repo)
- [ ] Extract each Server Action's core logic into a shared `lib/` function (no behavior change)
- [ ] Add the 10 route handlers from Section 6, each calling the matching shared `lib/` function
- [ ] Add Bearer-token auth middleware/helper used by every new route
- [ ] Confirm the existing web app still works unchanged (Server Actions either now call the same `lib/` functions, or remain untouched — either is fine, but there must be exactly one implementation of each piece of logic)
- [ ] Add `device_tokens` table + migration
- [ ] Build the push-dispatch helper (Section 7) and wire it into the three existing alert-trigger points
- [ ] Build the daily bill-reminder job (Section 8)

### Phase 1 — Mobile Foundation
- [ ] Expo project scaffolded, TypeScript, expo-router, NativeWind configured with the web app's color/spacing tokens
- [ ] Supabase client configured with `expo-secure-store` session persistence
- [ ] Sign In / Sign Up screens working against the existing Supabase Auth user pool
- [ ] Onboarding flow (3 steps) ported, gating first dashboard visit
- [ ] Bottom tab navigation scaffolded (screens can be stubs at this point)

### Phase 2 — Core Data Flows
- [ ] Dashboard screen: KPIs, budget ring, both charts, subscriptions widget, upcoming bills widget — all reading live Supabase data
- [ ] Transactions screen: list, Sync Bank, Auto Categorise, Add Transaction, CSV import — all wired to the Phase 0 API routes / direct Supabase calls per Section 4's rule of thumb

### Phase 3 — Planning Features
- [ ] Budgets screen: list, create, progress display, historical view
- [ ] Bills screen: list, create, mark-paid
- [ ] Subscriptions screen: list, scan, status actions

### Phase 4 — Intelligence & Push
- [ ] Insights screen: category cards, AI tip generation
- [ ] Device-token registration wired into app launch / login
- [ ] Push notifications confirmed firing for all three alert types on a physical device
- [ ] In-app notification center screen

### Phase 5 — Polish & Build
- [ ] Empty states, loading states, pull-to-refresh, basic haptics on key actions
- [ ] App icon, splash screen
- [ ] EAS Build configured for iOS and Android
- [ ] Successful install via TestFlight (iOS) and Internal Testing track (Android)

---

## 11. Non-Functional Requirements

| Area | Requirement |
|---|---|
| Security | No Gemini API key or Supabase service-role key ever shipped in the mobile bundle. All AI calls go through Section 6's API routes. All direct Supabase calls from mobile use the authenticated user's JWT, relying on existing RLS policies — never the service role key. |
| Auth | Supabase Auth session persisted securely (`expo-secure-store`, not AsyncStorage) and refreshed automatically; sign-out clears the stored session and the registered device token. |
| Performance | Dashboard and Transactions screens should render cached/last-known data instantly on cold start, then refresh from network (stale-while-revalidate pattern) rather than showing a blank loading screen every launch. |
| Consistency | A user signed in on both web and mobile sees the same data, since both read/write the same Supabase tables — no mobile-only or web-only data silos. |
| Error handling | Every API call (Section 6) has a visible failure state in the UI — no silent failures, especially for Sync Bank / Auto Categorise / Scan, since these are the most demo-critical actions. |

---

## 12. Environment & Config

**New environment variables needed (Next.js app, for the new API routes — likely already present for Server Actions, confirm reuse):**
- `GEMINI_API_KEY` (existing, server-side only)
- `SUPABASE_SERVICE_ROLE_KEY` (existing, server-side only — used only where the current Server Actions already use it, not introduced newly for mobile)
- `EXPO_ACCESS_TOKEN` (new, if using Expo's push API server-side with authenticated requests)

**New environment variables for the Expo app (client-side, safe to expose — anon key only):**
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_API_BASE_URL` (the deployed Next.js app's base URL, for the Section 6 routes)

---

## 13. QA Checklist Before Calling Any Phase "Done"

- [ ] Feature produces identical data to its web counterpart when exercised against the same account (e.g., Sync Bank on mobile inserts the same shape of transactions as on web)
- [ ] No feature on mobile silently fails without a visible error state
- [ ] No API route is callable without a valid auth token (test with a missing/invalid Bearer token — should return 401)
- [ ] Push notification received on a real device, not just logged in the Expo dev console
- [ ] App does not crash on cold start with no network connection (should show cached data or a clear offline state, not a white screen)

---

## 14. Assumptions & Open Questions for the Agent to Flag if Wrong

- Assumes the Supabase schema listed in Section 5 matches production exactly — verify against the live project before writing queries.
- Assumes Supabase Auth is currently email/password only (no OAuth providers) — confirm before building the mobile sign-in screen, since social auth needs different deep-link handling in Expo.
- Assumes the Next.js app will be deployed somewhere reachable by the mobile app over HTTPS (e.g., Vercel) for the Section 6 routes — if it's currently only run locally, deployment is a prerequisite, not an afterthought.
- Assumes "Accounts" and "Settings" nav items can be excluded or stubbed — confirm with the product owner if either is expected to be functional for the mobile release.
