# Smart Finance Tracker
## Product Requirements Document

**Feature Expansion Roadmap — Pre-Mobile-Conversion Phase**

- **Prepared for:** Smart Finance Tracker web application
- **Repository:** github.com/Roomi5Ahmed/Finance
- **Date:** September 20, 2026

---

## 1. Overview & Purpose

The Smart Finance Tracker is a Next.js + Supabase + Gemini-powered personal finance dashboard that currently offers AI auto-categorization, proactive insights, bank aggregator ingestion, bulk CSV import, and a live analytics dashboard. This PRD defines the feature set to be built before the application is converted into a native mobile app.

The objective of this phase is to bring the web application to full functional parity with what users will expect from a mobile finance app — proactive alerting, forward-looking planning tools (budgets, goals, bills), a consolidated financial position view, and light automation — so that the mobile conversion is a platform change rather than a feature-building exercise.

### 1.1 Goals

- Move the product from a reactive expense tracker to a proactive financial assistant.
- Consolidate a notification pipeline once, on web, so mobile push is a delivery-channel addition rather than new plumbing.
- Avoid low-value, high-maintenance features (e.g. a hand-curated subscription-alternatives list) in favor of automation built on data the app already has.
- Keep all new functionality inside Server Actions / callable backend functions so mobile can reuse the same backend without duplicating business logic.

### 1.2 Non-Goals

- A curated database of subscription "cheaper alternatives" — replaced by automatic detection (F1) that surfaces the user's own data instead.
- Direct bill-pay or fund-transfer execution — the app remains read/insight/reminder-oriented, not a payments product.
- Automated dispute filing with banks for flagged fraud (F6) — the app flags and lets the user act outside the app.
- Investment portfolio tracking (mentioned in earlier brainstorming) — deferred pending a decision on scope; not detailed in this PRD.
- The native mobile app build itself — this PRD covers web feature completion; the mobile conversion is a subsequent workstream.

---

## 2. Feature Specifications

Each feature below includes the problem it addresses, functional requirements, user stories, and the data model impact. Features are ordered by proposed implementation priority (see Section 3 for phasing).

### F1. Automatic Recurring Subscription Detection

| Priority | Effort | Depends on |
|---|---|---|
| P0 (High) | M | None |

**Problem**
Users have no visibility into recurring charges (OTT, SaaS, memberships) scattered across transactions, and manually curated "cheaper alternative" lists are high-maintenance and low-value.

**Description**
Detect recurring payments automatically by clustering transactions on merchant name, amount (with tolerance), and interval (~28-31 days, or weekly/annual patterns). Surface them in a dedicated "Subscriptions" view with total monthly spend, next expected charge date, and a price-change flag. No curated alternatives database is built — the system surfaces the data and lets the user decide what to cancel.

**User Stories**
- As a user, I want to see all my recurring subscriptions in one place so I know what I'm paying for.
- As a user, I want to be warned when a subscription's price increases so I'm not silently overcharged.
- As a user, I want to see my total monthly recurring spend as a single number.

**Functional Requirements**
- Detection job runs on new transaction ingestion (CSV import and webhook) and as a nightly batch re-scan.
- Clustering logic: same normalized merchant name + amount within ±5% + interval within ±3 days of a recurring cadence (weekly/monthly/quarterly/annual), minimum 2 occurrences to flag as candidate, 3+ to mark confirmed.
- Each detected subscription stores: merchant, category, average amount, cadence, last charge date, predicted next charge date, status (active/lapsed/cancelled-by-user).
- UI: dedicated Subscriptions tab listing all active subscriptions sorted by amount, with total monthly and annual cost.
- Alert when a recurring charge amount changes by more than a configurable threshold (default 10%) vs. its trailing average.
- User can mark a subscription as "cancelled" to stop future detection matches from re-adding it, and mark false positives as "not recurring."

**Data Model Impact**
- `subscriptions(id, user_id, merchant_normalized, category_id, avg_amount, cadence, first_seen_at, last_charged_at, next_expected_at, status, price_history jsonb)`
- `transactions` gets a nullable `subscription_id` foreign key.

---

### F2. Budgets with Threshold Alerts

| Priority | Effort | Depends on |
|---|---|---|
| P0 (High) | M | Existing transaction/category pipeline |

**Problem**
Users can see past spend but have no forward-looking control mechanism to stay within a plan.

**Description**
Let users set monthly (and optionally weekly) budget limits per category, or one overall budget. Track live spend-to-date against the limit and notify at configurable thresholds (e.g. 80%, 100%, 120%).

**User Stories**
- As a user, I want to set a monthly limit for "Dining Out" and get notified as I approach it.
- As a user, I want a single dashboard view of all my budgets and how much of each is used.
- As a user, I want budgets to automatically roll over to the next month.

**Functional Requirements**
- Budget CRUD: category (or "overall"), amount, period (weekly/monthly), start date, auto-renew toggle.
- Real-time (or near-real-time, on transaction write) recomputation of spend-to-date per active budget.
- Configurable alert thresholds per budget (default 80% and 100%); alerts fire once per threshold per period (no repeat spam).
- Dashboard widget: progress bars per budget, color-coded (green/amber/red), remaining amount and days left in period.
- Historical view: how a budget performed over past periods (met / exceeded / by how much).

**Data Model Impact**
- `budgets(id, user_id, category_id nullable, amount, period, start_date, auto_renew, alert_thresholds int[])`
- `budget_alerts_sent(id, budget_id, period_start, threshold, sent_at)` to dedupe notifications.

---

### F3. Savings Goals

| Priority | Effort | Depends on |
|---|---|---|
| P1 (Medium) | S-M | Existing transaction/category pipeline |

**Problem**
The app tracks spending but has no forward-looking, motivating structure for saving toward something specific.

**Description**
Users create named goals with a target amount and optional target date. Progress is computed from either manual contributions or a linked tracked balance, and visualized with a progress indicator and projected completion date at current savings rate.

**User Stories**
- As a user, I want to create a goal like "Emergency fund: ₹100,000 by December" and track progress.
- As a user, I want the app to tell me if I'm on pace to hit my goal by the target date.

**Functional Requirements**
- Goal CRUD: name, target amount, target date (optional), linked account or manual-contribution mode, icon/color.
- Progress bar + projected completion date based on trailing 3-month average contribution rate.
- Manual "add contribution" action; optional automatic contribution detection from transfers to a designated savings account.
- Goal completion celebration state (UI only, no financial logic).

**Data Model Impact**
- `goals(id, user_id, name, target_amount, target_date, linked_account_id nullable, current_amount, status)`
- `goal_contributions(id, goal_id, amount, source ['manual'|'transfer'], created_at)`

---

### F4. Bill Reminders

| Priority | Effort | Depends on |
|---|---|---|
| P1 (Medium) | S | Existing transaction/category pipeline |

**Problem**
Fixed, non-subscription obligations (rent, EMI, insurance premiums) have due dates that users must track manually.

**Description**
A separate reminder system (distinct from F1's transaction-detected subscriptions) where users can manually add bills with due dates and recurrence, and receive reminders ahead of the due date.

**User Stories**
- As a user, I want to add my monthly rent due on the 5th and get reminded 3 days before.
- As a user, I want to mark a bill as paid and have it reschedule for the next cycle.

**Functional Requirements**
- Bill CRUD: name, amount (optional/estimate), due day/date, recurrence (monthly/quarterly/annual/one-off), reminder lead time (default 3 days).
- Reminder notification fired once per cycle at lead time; snooze option.
- Mark-as-paid action advances due date to next cycle for recurring bills and optionally logs a transaction.
- Optional reconciliation: match a paid bill against an incoming transaction (same amount ± merchant hint) to auto-mark-as-paid.

**Data Model Impact**
- `bills(id, user_id, name, amount_estimate, due_rule jsonb, next_due_at, reminder_lead_days, status)`
- `bill_payments(id, bill_id, paid_at, amount, matched_transaction_id nullable)`

---

### F5. Multi-Account Aggregation & Net Worth View

| Priority | Effort | Depends on |
|---|---|---|
| P1 (Medium) | M-L | Existing transaction/category pipeline |

**Problem**
The existing aggregator webhook ingests transactions per account, but there is no unified cross-account view of overall financial position.

**Description**
Aggregate balances across all linked accounts (checking, savings, credit cards) into a single net worth figure, tracked over time as a trend line, with a per-account breakdown.

**User Stories**
- As a user with multiple bank accounts, I want to see my total balance across all of them in one place.
- As a user, I want to see how my net worth has trended over the last 6-12 months.

**Functional Requirements**
- Account model supports multiple linked accounts per user, each with a running balance updated from webhook/CSV ingestion.
- Daily balance snapshot job to build a historical net worth time series (sum of asset accounts minus liability/credit accounts).
- Dashboard chart: net worth trend line, with per-account breakdown table below.
- Manual account entry supported for accounts without aggregator/CSV coverage (e.g. cash, investments as a single manual balance).

**Data Model Impact**
- `accounts(id, user_id, institution, account_type ['asset'|'liability'], display_name, current_balance, source ['webhook'|'csv'|'manual'])`
- `balance_snapshots(id, account_id, balance, snapshot_date)` — one row per account per day.

---

### F6. Anomaly & Fraud Alerts

| Priority | Effort | Depends on |
|---|---|---|
| P1 (Medium) | M | Existing transaction/category pipeline |

**Problem**
Unusual or duplicate charges currently require the user to manually notice them while reviewing the dashboard.

**Description**
Layer on top of the existing categorization pipeline: flag transactions that are statistical outliers for a merchant/category, exact duplicates within a short window, or from a first-seen merchant above a spend threshold.

**User Stories**
- As a user, I want to be alerted if I'm charged twice for the same thing within an hour.
- As a user, I want to be flagged if a category suddenly sees an unusually large transaction.

**Functional Requirements**
- Duplicate check: same merchant + same amount within a configurable window (default 60 minutes) → flag as possible duplicate.
- Outlier check: transaction amount > (mean + 2×std dev) for that category over trailing 90 days → flag as unusual.
- New-merchant-large-amount check: first transaction from a merchant exceeding a configurable absolute threshold → flag for review.
- Flagged transactions appear in a review queue; user can dismiss (mark as legitimate) or confirm as fraudulent (routes to a "disputed" status, no external action taken by app).

**Data Model Impact**
- `transactions` gains `flag_type` (nullable enum: duplicate/outlier/new_merchant_large) and `flag_status` (pending/dismissed/disputed).

---

### F7. Shared / Family Accounts

| Priority | Effort | Depends on |
|---|---|---|
| P2 (Later) | L | Existing transaction/category pipeline |

**Problem**
The app is single-user only; households who want to track finances jointly cannot currently share a workspace.

**Description**
Allow a primary user to invite one or more members into a shared workspace with configurable per-member permissions (view-only vs. full edit), building on the existing Supabase RLS model.

**User Stories**
- As a user, I want to invite my partner to see and add transactions to our shared budget.
- As an invited member, I want to see which transactions I added versus my partner.

**Functional Requirements**
- Workspace concept introduced: a workspace has one owner and N members with roles (owner/editor/viewer).
- RLS policies extended from per-user to per-workspace-member scoping.
- Invite flow via email/link with role selection; owner can revoke access.
- Transactions and budgets attributed to the workspace, with an "added by" field for audit/attribution.

**Data Model Impact**
- `workspaces(id, owner_id, name)`
- `workspace_members(workspace_id, user_id, role, invited_at, accepted_at)`
- Existing tables (transactions, budgets, goals, bills) gain a `workspace_id` in place of/alongside `user_id`; RLS policies rewritten accordingly.

---

### F8. Reports & Export

| Priority | Effort | Depends on |
|---|---|---|
| P2 (Later) | S-M | Existing transaction/category pipeline |

**Problem**
Users cannot currently extract their data for tax filing, sharing with an advisor, or offline record-keeping.

**Description**
Generate monthly/custom-range summary reports (PDF) and raw data exports (CSV) covering transactions, category breakdowns, and budget performance.

**User Stories**
- As a user, I want to download a PDF summary of my spending for a given month.
- As a user, I want to export all my transactions as CSV for my own records or tax filing.

**Functional Requirements**
- Date-range picker driving both PDF and CSV export.
- PDF report includes: total income/spend, category breakdown chart, top merchants, budget performance summary.
- CSV export includes all transaction fields plus assigned category and subscription/bill linkage where applicable.
- Exports generated server-side (Server Action) and delivered as a downloadable file.

**Data Model Impact**
- No new tables; reads existing transactions/budgets/categories tables.

---

### F9. Receipt Scanning (Vision Capture)

| Priority | Effort | Depends on |
|---|---|---|
| P2 (Later) | M | Existing transaction/category pipeline |

**Problem**
Cash and offline transactions are invisible to bank-feed and CSV ingestion.

**Description**
Let users photograph a receipt; Gemini's vision capability extracts merchant, amount, date, and line items, pre-filling a manual transaction entry for user confirmation.

**User Stories**
- As a user, I want to snap a photo of a cash receipt and have it logged as a transaction without typing it in.

**Functional Requirements**
- Image upload (mobile camera or file picker) → sent to Gemini vision endpoint with a structured-extraction prompt (merchant, amount, date, category guess).
- Extracted data shown in a pre-filled confirmation form before saving; user can edit any field.
- Original receipt image stored (Supabase Storage) and linked to the resulting transaction for reference.
- Graceful failure state when extraction confidence is low: form opens blank with the image attached for manual entry.

**Data Model Impact**
- `transactions` gains `receipt_image_url` (nullable).
- Uses existing AI pipeline infrastructure (Server Action + Gemini client) already in the codebase.

---

### F10. Trend-Based AI Insights (Upgrade)

| Priority | Effort | Depends on |
|---|---|---|
| P1 (Medium) | S-M | Existing transaction/category pipeline |

**Problem**
Current AI insights analyze a single 30-day snapshot; they don't tell the user whether things are getting better or worse over time.

**Description**
Extend the existing insights pipeline to compare the current period against trailing historical periods (e.g. 3-month rolling average) and generate comparative, trend-aware insights, still backed by the existing local fallback engine.

**User Stories**
- As a user, I want insights that tell me "dining spend is up 40% vs your 3-month average," not just a flat snapshot.

**Functional Requirements**
- Extend the insights prompt/context payload to include trailing 3-month category averages alongside the current 30-day window.
- Prompt updated to bias toward comparative, trend-framed language.
- Local fallback engine (used during Gemini outages) updated with the same comparative calculation so behavior stays consistent when AI is unavailable.

**Data Model Impact**
- No new tables; aggregation query only, reusing existing transactions/categories.

---

## 3. Implementation Phasing

Proposed sequencing groups features by shared infrastructure and value delivered, so that later phases reuse work done in earlier ones (notably the notification pipeline established in Phase 1).

| Phase | Features | Rationale |
|---|---|---|
| **Phase 1 — Core financial control** (Weeks 1–4) | F1 Subscription Detection, F2 Budgets & Alerts, F4 Bill Reminders | Highest user value, reuse existing transaction/category data, and establish the notification pipeline mobile will depend on. |
| **Phase 2 — Insight & position** (Weeks 5–8) | F5 Multi-Account & Net Worth, F6 Anomaly Alerts, F10 Trend-Based Insights, F3 Savings Goals | Deepens analytical value once the notification and detection infrastructure from Phase 1 exists. |
| **Phase 3 — Expansion** (Weeks 9–12+) | F7 Shared Accounts, F8 Reports & Export, F9 Receipt Scanning | Larger scope or lower immediate priority; scheduled after core mobile-readiness needs are met. |

---

## 4. Non-Functional Requirements

| Area | Requirement |
|---|---|
| **Performance** | Detection/anomaly batch jobs must complete within 5 minutes for a user with up to 10,000 transactions; dashboard queries render under 2 seconds. |
| **Security** | All new tables inherit Row Level Security scoped to `user_id` (or `workspace_id` for F7); no new feature bypasses Supabase Auth-based access control. |
| **Notifications** | A single notification service abstraction (email + push-ready) is introduced in Phase 1 so budget, bill, subscription-price, and anomaly alerts share one delivery path — this is the same path mobile push will plug into. |
| **AI cost control** | All new Gemini-backed features (F9, F10) reuse the existing caching layer pattern and must degrade gracefully (local fallback or blank-state) on API outage, consistent with current insights behavior. |
| **Mobile readiness** | New features are built as Server Actions / API-callable functions rather than page-coupled logic, so the same backend can be called from a future React Native or equivalent mobile client without duplication. |

---

## 5. Success Metrics

- **Adoption:** % of active users who set at least one budget or goal within 30 days of feature launch.
- **Engagement:** % increase in weekly active sessions attributable to notification-driven return visits (budget/bill/subscription alerts).
- **Detection accuracy:** subscription detection precision/recall against a manually labeled sample of transactions (target ≥90% precision before promoting candidates to "confirmed").
- **Financial outcome proxy:** average number of subscriptions marked "cancelled" per user in the 60 days following Subscriptions tab launch.
- **Mobile-readiness proxy:** 0 instances of business logic that must be rewritten (rather than reused) when the mobile client is built.

---

## 6. Open Questions

- Which push notification provider (FCM/APNs via a unified service, or a third-party like OneSignal) should the Phase 1 notification abstraction target, given it needs to serve both web-push now and mobile push later?
- For F7 (Shared Accounts), should the RLS migration from per-user to per-workspace scoping happen as a big-bang migration or a parallel-schema rollout to avoid disrupting existing single-user data?
- What Gemini vision quota/cost ceiling is acceptable for F9 (Receipt Scanning) given it adds a second AI-cost surface alongside categorization and insights?
- Should F5's net worth view support manual investment/asset entry in this phase, or remain limited to bank-connected accounts until investment tracking is scoped separately?

---

## 7. Appendix — Current State (for reference)

Summarized from the existing repository README, for context on what this PRD builds on top of:

- AI auto-categorization via Google Gemini 2.5 Flash, with a caching layer for latency/cost.
- Proactive AI financial insights generated from the last 30 days of spending/income/category data, with a local fallback engine on Gemini outage.
- Bank Aggregator Webhooks ingesting live transaction payloads (Setu/Finvu style Account Aggregators).
- Bulk CSV import with automatic statement-template parsing (HDFC, SBI).
- Live analytics dashboard (Recharts) with KPIs and spending velocity tracking.
- Supabase Postgres backend with Row Level Security; Next.js Server Actions keep AI prompting and mutations server-side.
