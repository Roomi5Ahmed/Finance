# PRD: Past-Month Dashboard and Analysis
**Product:** Smart Finance Tracker (web + mobile) | **Status:** Ready for implementation | **Priority:** P1

---

## 1. Problem

Users can only see the **current month**. Imported statements (CSV, PDF) often cover earlier months, but there is no way to look back at how a past month went, compare months, or spot trends.

### Current behaviour (from the code)

- Web `dashboard/page.tsx` fetches **all** of the user's transactions, and `DashboardContent` filters to the current month on the client.
- Mobile `(tabs)/index.tsx` does the same with `monthStart = new Date(now.getFullYear(), now.getMonth(), 1)`.
- Budgets compute spend with `periodStart` = first of the *current* month (`dashboard/page.tsx`, `lib/api/budgets.ts`).
- Insights already compute "this month vs last month" (`insights/page.tsx`), but only as a fixed pair, not a selectable month.
- Fetching every transaction on each load will not scale as imports grow.

## 2. Goals and non-goals

**Goals**
- Let the user pick any month that has data and see the same dashboard for it.
- Show month-over-month comparison and a multi-month trend.
- Make month scoping happen on the server/database, not by downloading everything.
- Keep web and mobile consistent by sharing one API.

**Non-goals**
- Custom date ranges and year-level reports (listed as future work in section 9).
- Editing budgets retroactively for past months.
- PDF/CSV export of the analysis (separate feature).

## 3. User stories

- As a user, I want to switch to September and see my income, spend, categories and budgets for that month.
- As a user, I want to see how this month compares with last month, per category.
- As a user, I want a 6-month trend of income vs expenses and savings rate.
- As a user, after importing an old statement, I want to jump straight to the month it covered.

## 4. Functional requirements

### 4.1 Month selector
- Header control on the dashboard: `< September 2026 >` with previous/next arrows and a tap/click to open a month picker.
- Picker lists only months that **contain transactions** (plus the current month), newest first.
- Next arrow is disabled at the current month; previous is disabled at the earliest month with data.
- Selected month is held in the URL on web (`/dashboard?month=2026-09`) so it is shareable/bookmarkable, and in navigation state on mobile.
- Default is the current month. After a PDF/CSV import, if all imported rows fall in a past month, show a toast with "View <Month>".

### 4.2 Dashboard for a selected month
All existing widgets work for the selected month:
- KPIs: income, expenses, net/savings, savings rate.
- Spending trend chart: daily spend across **that month** (replacing the "last 7 days" view for past months; keep the 7-day view for the current month).
- Top categories bar chart.
- Category budgets: show each budget's spend vs limit **for that month**. For past months this is read-only (no alert firing, no edit).
- Past months hide "Upcoming Bills" (not meaningful). Subscriptions widget shows subscriptions that charged in that month.
- "Partial month" indicator for the current month and for months whose data range clearly does not cover the whole month.
- Empty state for months with no data.

### 4.3 Month-over-month comparison
- Card: "vs previous month" for income, expenses and savings with absolute and percentage change.
- Per-category table: this month, previous month, change %, with the biggest increases highlighted.
- Handle the "previous month has no data" case by hiding the comparison rather than showing 0% or infinity.

### 4.4 Trends view
- New "Trends" section/tab: last 6 months (selectable up to 12) of income vs expenses, savings rate line, and a stacked category chart.
- Tap a bar to jump to that month's dashboard.

### 4.5 Insights for a selected month
- Insights page accepts the same `month` parameter. The existing "last month" comparison becomes "previous month relative to the selected one".
- AI tips for a past month are generated from that month's data; cache by `(user, category, month)` to avoid repeat Gemini calls for immutable history.

### 4.6 Data and performance
- Do not load all transactions. Add a database function or query that aggregates by month:

```sql
create or replace function monthly_summary(p_user uuid, p_start date, p_end date)
returns table (
  month date, income numeric, expenses numeric, txn_count int
) language sql stable as $$
  select date_trunc('month', date)::date,
         coalesce(sum(amount) filter (where amount > 0), 0),
         coalesce(-sum(amount) filter (where amount < 0), 0),
         count(*)
  from transactions
  where user_id = p_user and date >= p_start and date < p_end
  group by 1 order by 1;
$$;

create or replace function category_summary(p_user uuid, p_start date, p_end date)
returns table (category_id uuid, spent numeric, txn_count int)
language sql stable as $$
  select category_id, -sum(amount), count(*)
  from transactions
  where user_id = p_user and amount < 0 and date >= p_start and date < p_end
  group by category_id;
$$;
```

- Add index `transactions(user_id, date desc)` if not present.
- Month boundaries: use the user's local time zone consistently (default `Asia/Kolkata`), and compare with half-open ranges (`>= start`, `< next month start`) to avoid end-of-month off-by-one errors that `lte` on `lastDay` can cause.
- Budgets helper takes `periodStart`/`periodEnd` parameters instead of hard-coding "now".

### 4.7 API (shared by web and mobile)

| Endpoint | Returns |
|---|---|
| `GET /api/dashboard?month=YYYY-MM` | KPIs, daily series, category breakdown, budgets-with-spend, subscriptions charged, comparison vs previous month |
| `GET /api/dashboard/months` | List of months that have data, with txn counts |
| `GET /api/dashboard/trends?months=6` | Per-month income, expenses, savings rate, category totals |

Web may call the same helper functions directly from Server Components; mobile calls the routes. Logic lives once in `lib/api/dashboard.ts`.

## 5. UX notes

- Keep the current month as the fast default path; month switching must feel instant (cache fetched months in memory; prefetch the adjacent months).
- Past months get a subtle "Viewing past month - read only" label so users do not expect alerts or edits.
- On mobile, swipe left/right across the header area to change month, in addition to arrows.
- Charts must handle months with 28 to 31 days and zero-spend days.

## 6. Edge cases

- Months with only income or only expenses.
- Uncategorised transactions: show an "Uncategorised" slice so totals still reconcile (and link to the review queue from the personal-payee PRD).
- Transactions near midnight on month boundaries (time-zone handling above).
- Imported transactions dated in the future or far past: allow viewing but cap the picker at the current month.
- Users with a single month of data: hide comparison and trends gracefully.

## 7. Success metrics

- Dashboard load time for a user with 10,000+ transactions stays under about 1.5 s (no full-table fetch).
- Percentage of sessions that view a non-current month (adoption).
- No discrepancies between category totals and month totals (reconciliation test passes).

## 8. Implementation phases (for the coding agent)

1. **Backend:** SQL functions, index, `lib/api/dashboard.ts`, the three API routes, budgets helper refactor to accept a period.
2. **Web:** month selector + URL param, refactor `DashboardPage` to fetch only the selected month, comparison card, past-month read-only behaviour.
3. **Mobile:** same selector and API usage in `(tabs)/index.tsx`, swipe gesture, cached months.
4. **Trends view** on both platforms.
5. **Insights month parameter** and per-month caching.
6. **Tests:** month boundary tests (31-day, 30-day, February, leap year), time-zone tests, reconciliation test (sum of categories equals month expenses), empty-month tests.

## 9. Future work

Custom date ranges, yearly summary, export to PDF/CSV, budget history snapshots (so a past month shows the budget limit that applied *then*, not today's limit), and goal/net-worth trend lines.

## 10. Open questions

- Should past-month budget comparisons use today's budget amounts (simple) or store monthly snapshots (accurate, needs a new table)? Recommend simple first, snapshots later.
- Financial month vs calendar month (e.g. salary on the 1st vs 25th)? Recommend calendar month now, with a configurable "month start day" as a later setting.
