# PRD: Categorising Personal-Name UPI Payees
**Product:** Smart Finance Tracker (web + mobile) | **Status:** Ready for implementation | **Priority:** P0

---

## 1. Problem

The new PDF statement import (Google Pay template) brings in many transactions where the payee is a **person's name** (e.g. "Ramesh Kumar") rather than a business: cab/auto drivers, tea stalls, vegetable vendors, small shops using personal UPI IDs. The name carries no category signal, so these transactions stay uncategorised, which skews the dashboard, budgets, insights and subscription detection.

### Root causes found in the current code

| # | Finding | Where |
|---|---|---|
| 1 | The Gemini prompt receives **only the merchant name**. Amount, time, direction and frequency are never sent. | `utils/gemini.ts` |
| 2 | Prompt rule 4 tells the model to *guess* for ambiguous names, so it either guesses wrongly or returns something unusable. | `utils/gemini.ts` |
| 3 | Results whose value does not contain a `-` are silently dropped as invalid, so these stay uncategorised with no signal to the user. | `lib/api/transactions.ts` (`autoCategoriseTransactions`) |
| 4 | `merchant_category_cache` has no notion of *who set the category*. AI results are upserted with `confidence: 0.85` and can overwrite a category the user chose. | `lib/api/transactions.ts` |
| 5 | There is no "review uncategorised" workflow, and no way to say "always categorise this payee as X, including past transactions". | UI gap |
| 6 | PDF import stores only `merchant`, `amount`, `date`, `notes` ("Imported via PDF"). Time of day is parsed but discarded. | `PDFImportModal.tsx` |

## 2. Goals and non-goals

**Goals**
- Cut the share of uncategorised transactions after a PDF import substantially (target: under 10% of imported rows left uncategorised after one review session).
- Never silently mis-categorise. Low-confidence results go to a review queue instead of being guessed.
- Make the user's own decisions permanent: categorise a payee once, and it applies to past and future transactions.

**Non-goals**
- Real-time identification of who a person is (no external lookup, no scraping).
- Splitting one payment across categories.
- Changing the bank-sync or CSV flows beyond reusing the same categoriser.

## 3. Solution overview: four layers, in priority order

Each transaction is resolved by the first layer that gives a confident answer.

1. **User rules (highest priority).** If the user has ever set a category for this payee, use it. Source = `user`, confidence 1.0. Never overwritten by AI.
2. **Deterministic rules.** Cheap, explainable, no AI cost (see 4.2).
3. **Context-aware AI (Gemini).** For remaining payees, send *behavioural context* (not just the name) and require a confidence score. Only apply when confidence is at or above a threshold (default 0.8).
4. **Human review queue.** Everything else is marked `needs_review` and shown grouped by payee so a handful of taps clears dozens of transactions.

## 4. Functional requirements

### 4.1 Data model changes

```sql
-- who/what assigned the category, and how sure we are
alter table transactions
  add column if not exists category_source text
    check (category_source in ('user','rule','ai','import')),
  add column if not exists category_confidence numeric(3,2),
  add column if not exists needs_review boolean not null default false,
  add column if not exists payee_type text
    check (payee_type in ('business','person','unknown')) default 'unknown',
  add column if not exists txn_time time;          -- keep time-of-day from PDF

alter table merchant_category_cache
  add column if not exists source text not null default 'ai'
    check (source in ('user','rule','ai')),
  add column if not exists payee_type text default 'unknown';

create index if not exists tx_review_idx
  on transactions(user_id) where needs_review = true;
```

Rules for the cache: an upsert from AI or rules **must not** overwrite a row whose `source = 'user'`. Enforce this in application code (check before upsert) or with an `on conflict ... where` clause.

### 4.2 Payee classification and deterministic rules

Add `lib/categorisation/payee.ts` exporting `classifyPayee(name, ctx)`.

- **Business vs person heuristics.** Treat as *business* if the name contains known business tokens (store, mart, traders, enterprises, pharmacy, restaurant, cafe, hotel, bakery, medical, electricals, etc.), brand names already known to the cache, or legal suffixes (Pvt, Ltd, LLP). Treat as *person* if it looks like 1 to 3 capitalised alphabetic words with no business token. Otherwise `unknown`. Keep the token list in one editable file.
- **UPI handle hints (only if the source statement exposes the UPI ID).** Merchant QR handles often look different from personal handles. Do not rely on this for GPay PDFs unless the parser actually extracts a VPA; implement as an optional signal.
- **Direction.** Credits from a person default to "Transfers In / Reimbursement", not income, unless the user rule says otherwise.
- **Amount and pattern signals** used as *hints to the AI layer*, not as hard rules: small round amounts (multiples of 10 or 50, under about 500), repeated same-amount payments to the same person, same weekday/time pattern (commute), very round large amounts (rent, loans, transfers to family).

Add a fallback category **"Personal Transfers"** (global default, icon + colour) so a person-to-person payment with no better answer has a legitimate home instead of being "uncategorised".

### 4.3 Context-aware Gemini categorisation

Replace the name-only prompt with a **per-payee context object**:

```json
{
  "payee": "Ramesh Kumar",
  "payee_type_guess": "person",
  "txn_count": 14,
  "amounts": [60, 60, 80, 60, 120],
  "typical_amount": 60,
  "total": 1020,
  "direction": "debit",
  "time_of_day_buckets": {"morning": 9, "evening": 4},
  "weekday_pattern": "Mon-Fri mostly",
  "date_range": "2026-08-02..2026-10-14"
}
```

Prompt requirements:
- Return JSON of the form `{ "<payee>": { "category_id": "<id or null>", "confidence": 0.0-1.0, "reason": "<short>" } }`.
- **Remove "just guess" instruction.** Instruct: *if you cannot justify a category from the evidence, return `null` with low confidence.*
- Use `responseMimeType: "application/json"` in `generationConfig` to avoid the fragile markdown-stripping.
- Batch up to ~30 payees per call; keep per-payee stats compact.
- Validate every returned `category_id` against the user's real category list (UUID check **and** membership), and log rejects instead of dropping them silently.

Apply the result only if `confidence >= 0.8` (configurable constant). Otherwise set `needs_review = true`, and store the AI suggestion on the row/cache so the review UI can show it as a pre-selected suggestion.

### 4.4 Review queue ("Needs review")

**Web** (`Transactions` page) and **mobile** (`Transactions` tab):
- A banner/chip: "N transactions need a category" with a button to open the review queue.
- The queue is **grouped by payee**, sorted by total spend descending. Each card shows: payee name, number of transactions, total, typical amount, date range, payee type badge, and the AI suggestion (if any) as a highlighted option.
- One tap on a category assigns it to **all** transactions of that payee (past and future) and writes a `source='user'` cache row. A secondary action allows "only this transaction".
- Optional label per payee ("Ramesh - auto driver") stored with the cache row to jog memory later. Nice to have, P2.
- Skip option, and a "Mark as Personal Transfer" shortcut.
- Empty state when cleared.

### 4.5 Learning from corrections

- When a user changes a transaction's category anywhere in the app, offer: "Apply to all transactions from *Ramesh Kumar*?" (default on). Creates/updates the `source='user'` cache row.
- Re-running auto-categorise must respect the precedence in section 3 and must never alter rows where `category_source = 'user'`.

### 4.6 PDF import changes

- Keep the time-of-day already matched by `TIME_RE` and save it to `txn_time`.
- Mark imported rows `category_source = 'import'` with no category, then run the pipeline in section 3 automatically after import.
- After import, show a summary: "42 imported, 29 auto-categorised, 13 need review" with a button into the review queue.

### 4.7 API changes (so web and mobile share logic)

| Endpoint | Purpose |
|---|---|
| `POST /api/transactions/categorise` | Existing. Now runs the 4-layer pipeline and returns `{ categorised, needsReview }`. |
| `GET /api/transactions/review` | Returns payee groups needing review, with stats and AI suggestion. |
| `POST /api/transactions/review/resolve` | Body `{ payee, categoryId, applyToAll: boolean, label? }`. Writes the user cache row and updates matching transactions. |

All logic lives in `lib/api/` helpers; Server Actions and route handlers call the same functions (consistent with the existing architecture).

## 5. Edge cases

- Same person paid for different purposes (e.g. a friend: dinner split one day, rent another). Per-payee rules are a default only; the user can override a single transaction, and the pipeline must not re-override it.
- Name variants between statements ("RAMESH KUMAR" vs "Ramesh Kumar"). Normalise case and whitespace for cache matching; do not strip meaningful words.
- Credits (money received) must not be forced into expense categories.
- Gemini outage or missing key: skip layer 3, push remaining payees to the review queue (no fake "mock" categories in production paths).
- Rate and cost: only payees without a `user` or `rule` match go to Gemini; cache results.

## 6. Success metrics

- Uncategorised share after import and one review session: under 10%.
- Review effort: median taps to clear a statement is at most the number of distinct unresolved payees.
- AI precision at the 0.8 threshold: at least 90% when audited against user corrections.
- Corrections rate on AI-assigned rows trends down over time as user rules accumulate.

## 7. Implementation phases (for the coding agent)

1. **Schema + precedence:** migrations in 4.1; update `autoCategoriseTransactions` to respect `source` and stop overwriting `user` rows; add "Personal Transfers" category.
2. **Context-aware AI:** payee stats builder, new prompt, JSON mode, confidence threshold, validation, `needs_review` flagging.
3. **Review queue:** API endpoints (4.7) plus web UI and mobile UI.
4. **Correction learning + PDF post-import summary.**
5. **Tests:** unit tests for `classifyPayee`, precedence rules, and an end-to-end fixture with a sample GPay PDF full of personal-name payees.

## 8. Open questions

- Does the Google Pay PDF text expose a UPI ID or only the display name? (If only names, drop the VPA heuristic for now.)
- Should "Personal Transfers" count toward spending totals and budgets, or be excluded from "spend" the way some apps treat P2P? Recommend: include debits by default, with a toggle later.
