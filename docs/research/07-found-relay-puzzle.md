# Found, Relay, Puzzle.io & Open Bank Feeds Benchmark

**Check Date:** `2026-10-25`

## 1. Year-Round Fed + State Estimated Tax Engine (`Found` + `Relay`)

### How `Found` Eliminates Q4 Tax Shock
- **Tax Profile Baseline:** Filing status, outside W-2 wages + withholdings, other household income, credits/adjustments, and a user-configured **flat State/Local effective tax `%`** (avoiding maintaining 50-state progressive bracket engines while modeling full progressive Federal brackets + SECA).
- **Real-Time Schedule C Tax Stack (2026 Parameters):**
  - **SECA (`15.3%`):** Applied to `92.35%` of YTD net profit (`12.4%` OASDI up to `$184,500` 2026 cap net of W-2 wages + `2.9%` Medicare + `0.9%` Additional Medicare above `$200k`/`$250k`).
  - **Above-the-Line & QBI:** Deducts `50%` SECA, self-employed health insurance, and **SEP-IRA / Solo 401(k)** contributions, plus the permanent **`20%` QBI (`IRC §199A`)** deduction (reduces Federal income tax, not SECA) and standard deduction (`$16,100` Single / `$32,200` MFJ).

### Safe Harbor vs. Rolling YTD / Annualized Modes
1. **Prior-Year Safe Harbor (`IRC §6654(d)(1)(B)`):** `100%` of prior-year total tax (`110%` if prior AGI `> $150k`). Protects growing stores from underpayment penalties while preserving cash—**but must display both the Safe-Harbor Minimum Due and the Projected Full-Year True-Up Reserve** so April 15 cash isn't spent (plus high-income state exceptions like CA `$1M` AGI safe-harbor repeal).
2. **Current-Year `90%` / Rolling YTD:** Prevents severe overpayment during slower revenue years.
3. **IRS Annualized Income (`Form 2210 Sched AI`):** Cumulative `3 / 5 / 8 / 12`-month windows (`Jan–Mar`, `Jan–May`, `Jan–Aug`, `Jan–Dec`), ideal for Q4-heavy ecommerce stores with clean monthly cutoffs.

### Per-Payout Reserve Waterfall & Tax-Year Tagging
- **E-Commerce Payout Waterfall Rule:** Strip **100% of Sales Tax Collected** (`Sales Tax Held in Trust`) and **Processor Fees** *first*, then apply dynamic income-tax reserve `%` (`r_smart`) only to **Net Real Revenue** (throttling down to `0%` automatically when deductible expenses/inventory/SEP-IRA reduce projected liability below current reserve + YTD credited payments).
- **Strict Tax-Payment Tagging (`tax_year`, `jurisdiction`, `kind`):** Income-tax estimates post to `Equity:OwnerDraws:EstimatedTax` (not deductible business expense) and strictly separate `2026 PRIOR_YEAR_BALANCE_DUE` paid in April from `2027 Q1_ESTIMATE` paid the same day. Supports state quarter weights (e.g., CA `30% / 40% / 0% / 30%`).
- **Entity Mode Gap in Found (`S-Corp`):** Found disables automated tax estimation completely for `S-Corps` (`1120-S`). Modeling `SOLE_PROP_SCHED_C` vs. `S_CORP_1120S` natively lets `dinkuskit/books` account for W-2 officer salary/withholding, `$0` SECA on K-1 profit, and the `25%-of-W-2` vs. `~20%-of-net-SE` SEP-IRA rule.

## 2. Simultaneous Dual-Basis Core (`Puzzle.io` + `Beancount`)

- **Atomic Event -> Dual-Basis Postings (`Puzzle.io`):** Source events deterministically emit balanced integer-cent postings tagged for `CASH` and `ACCRUAL` (plus native `Prepaid`, `Fixed Asset`, and `Deferred Revenue` subledger schedules that leave Cash untouched while amortizing monthly on Accrual).
- **Governed AI Close:** Append-only ledger (corrections use reversing + new entries tagged with `actor`); AI stages categorizations and surfaces **Spotlight anomalies** ahead of a human-stamped **Period Lock (`YYYY-MM`)**.
- **Beancount Invariants:** Exact integer minor-unit zero-sum postings + start-of-day **`balance` assertions (`00:00:00`)** that catch missing webhooks, duplicate CSV rows, or sign flips to the exact cent.

## 3. Open / Self-Hosted Bank Feed Reality (`SimpleFIN` vs. `Plaid` vs. `OFX/CSV`)

- **SimpleFIN Bridge (`$15/yr` user-paid, `$0` vendor cost):** Covers up to 25 institutions via MX; one-time Base64 `Setup Token` claims a read-only `Access URL` (`<= 24` polls/day, 90-day window). Supports US checking and **Amex Business** (with occasional Amex MFA re-auth via SimpleFIN web UI, backed up cleanly by Amex OFX/QFX/CSV).
- **Native Read-Only APIs (`$0`):** Direct Stripe + Mercury read-only tokens provide instant, zero-MFA feed sync where used.
- **4-Tier Deduplication Waterfall:**
  1. Canonical `(account_id, source_type, external_txn_id)` (`FITID`, Stripe `txn_`, SimpleFIN `id`).
  2. `pending -> posted` in-place promotion (`<= 5` days, exact `amount_cents`, normalized merchant token).
  3. CSV `SHA-256(account_id || date || amount_cents || norm_desc || day_ordinal)` so legitimate identical same-day charges (e.g., two `$12.40` labels) survive while overlapping CSV re-imports dedupe idempotently.
  4. `balance_checkpoint` assertions on every statement/OFX/SimpleFIN settled balance.

## 4. Adopt / Adapt / Defer / Reject for `dinkuskit/books`

- **Adopt:** Three-bucket cash header (`Sales Tax Held in Trust` + `Fed/State Income Tax Reserve` [Safe-Harbor bar + Full-Year Cushion bar] + **`True Spendable Cash`**), dual-basis integer-cent ledger + `balance_checkpoint` assertions, and SimpleFIN + native Stripe + 4-tier OFX/CSV dedupe waterfall.
- **Adapt:** Extend Found's rolling estimator with side-by-side **Safe Harbor vs. Projected Liability**, **S-Corp (`1120-S`) mode**, **SEP-IRA deduction simulator**, and explicit framing as **user-configured reserve math** (never unlicensed tax advice); generate bank transfer sweep recommendations without holding ACH write credentials.
- **Defer / Reject:** Custodial IRS/state payment transmission, 50-state progressive bracket return prep, and mandatory vendor-hosted Plaid proxies.

## Sources
- https://found.com/help/how-is-my-tax-estimate-calculated
- https://found.com/help/how-does-my-taxes-pocket-work
- https://found.com/help/guide-to-taxes-on-found
- https://found.com/pricing
- https://relayfi.com/profit-first
- https://puzzle.io/pricing
- https://puzzle-api.readme.io/reference/welcome
- https://beancount.github.io/docs/
- https://www.simplefin.org/protocol.html
- https://beta-bridge.simplefin.org/info/developers
- https://actualbudget.org/docs/experimental/simplefin-sync
- https://www.irs.gov/businesses/small-businesses-self-employed/estimated-taxes
