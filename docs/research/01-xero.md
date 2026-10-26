# Xero Competitive & Architectural Benchmark

**Check Date:** `2026-10-25`

## 1. Reconciliation Engine & Bank Feeds

### Ingestion Channels & Failure Modes
- **Direct Bank Feeds (OAuth / Open Banking):** Direct API partnerships with major banks pull settled statement lines every ~24 hours with running balances.
- **Aggregator Feeds (Plaid & Yodlee):** Fallback for regional banks and credit unions; prone to 90-day consent expirations, temporary disconnects, and overlapping/missing date windows on reconnect.
- **Manual File Imports (`OFX` / `QFX` / `.QBO` vs. `CSV`):**
  - **`OFX`/`QFX`:** Embeds a bank-issued unique transaction ID (`FITID`). Duplicate `FITID`s are deterministically dropped and logged in Statement Exceptions.
  - **`CSV`:** Lacks `FITID`s and requires manual column/sign mapping. Heuristic `(Date, Amount, Reference/Description)` deduping misses overlapping exports or corrupts balances when debit/credit signs invert.
  - **Ledger-Side Duplicates:** Repaired via **Remove & Redo** (unlinks and deletes the GL entry while preserving the immutable raw statement line) vs. **Unreconcile** (unlinks while keeping the GL entry open).

### Dual-Balance Tie-Out & Conversion Cutoff
- **Statement Balance** = `Opening/Conversion Bank Balance + sum(Imported Statement Lines)`. Drift vs. actual bank statement proves missing/duplicate feed lines or a bad opening balance.
- **Ledger Balance** = `Opening/Conversion Bank Balance + sum(Posted GL Account Transactions)`. Differs from Statement Balance only by unreconciled feed lines and uncleared GL entries.
- **Conversion Date & Balances:** Org-wide cutoff date; opening Trial Balance + open pre-conversion items post any residual to `Historical Adjustment` equity.

### Matching Primitives
- **Bank Rules:** Priority-ordered `ALL`/`ANY` rules across Payee, Description, Amount, Reference proposing `Spend Money`, `Receive Money`, or `Transfer` with fixed-`$` or `%` splits.
- **`Find & Match`:** Interactive N-to-M matcher linking 1 bank line to multiple open items, partial **Split** settlement, inline `Overpayment`/`Prepayment`, and **Minor Adjustments** (posting cent-level rounding/fees inline).
- **Bank Transfers:** Dedicated linked inter-account transfer primitive between `BANK`/CC accounts so internal sweeps and card payoffs never inflate revenue or expense.
- **Suspense & Clearing Accounts:** Because Manual Journals cannot post directly to `BANK`, `ACCREC`, or `ACCPAY`, external sub-ledgers use Current Asset/Liability **Clearing Accounts** (`Stripe Clearing`, `Payroll Clearing`, expected to net to `$0.00`) and **Suspense** for temporary uncoded cash parking.

## 2. Core Ledger & Reporting (Cash vs. Accrual)

- **Single Accrual Core:** Immutable journal ledger written via typed objects (`Invoices`/`CreditNotes`, `Payments`, `BankTransactions`, and `ManualJournals` with `ShowOnCashBasisReports: boolean`).
- **Dynamic Cash-Basis Engine (`paymentsOnly=true`):** Computed at query time without mutating stored journals:
  - Excludes unpaid invoices/bills; pro-rata allocates settled `Payments` across original nominal accounts and tax codes on `Payment.Date`; includes direct `BankTransactions` and `ManualJournals` where `ShowOnCashBasisReports == true`.
- **GL Export Constraint:** Raw system exports are accrual-only; API `/Journals` read access (`accounting.journals.read`) is gated behind Xero's `$1,445 AUD/mo` (~`$895 USD/mo`) Advanced developer tier plus security audit.

## 3. Ecommerce Payout & US Tax Gaps

- **Net Deposit Decomposition Pain:** Net processor payouts bundle multi-day gross sales, discounts, shipping, gift-card liabilities, refunds, chargebacks, fees, and sales tax across month boundaries, forcing merchants onto paid middleware (**A2X** `$29–$249+/mo` or **Synder** `$52–$240+/mo`).
- **US Sales Tax Limits:** Built for single-authority VAT/GST; US Auto Sales Tax (Avalara) applies to Xero-issued AR invoices rather than external storefront checkouts. Zero native *Wayfair* state economic-nexus tracking.
- **Zero Estimated Income Tax Awareness:** Stops at Book Net Profit; no concept of Schedule C / S-Corp pass-through rules, SE tax, QBI, owner draws, or `1040-ES` prior-year safe harbor vs. annualized profit reserves.

## 4. Contractors (`1099`) & Gusto Payroll Sync

- **Native `1099` Tracking:** Digital W-9 capture, expense-account-to-box mapping (`$2,000` federal threshold from `TY2026` under OBBBA `IRC §§ 6041/6041A` for `1099-NEC` Box 1 and general `1099-MISC` rents/other, alongside retained `$10` Box 2 royalties / `$600` Box 10 attorney gross proceeds exceptions), automatic `1099-K` exclusion for card/processor rails (`stripe`/`paypal`/card) vs. `ach`/`check`/`wire`, and partner e-file handoff (`~$2–$5`/form via Avalara/Tax1099/Track1099).
- **W-2 Payroll via Gusto:** Xero delegates US W-2 payroll to Gusto (`$36/mo + $6/person` add-on, or standalone Gusto `$49–$80/mo + $6–$12/person`). Gusto posts a balanced journal (`Gross Wages`, `Employer Taxes`, `Benefits` -> `Payroll Clearing`, `Payroll Tax Clearing`), reconciled against 3–4 separate bank ACH pulls.

## 5. Pricing & The Fatal Agentic API Gap

- **US Pricing (Oct 2026):** Early `$27/mo` (20-invoice/5-bill cap, no bulk rec), Growing `$59/mo`, Established `$97/mo`. Full ecommerce stack TCO reaches `$160–$400+/mo`.
- **API & MCP Dealbreaker:** While Xero offers `@xeroapi/xero-mcp-server` and hosted MCP (`https://api.xero.com/mcp/v1`), Xero's public Accounting API **withholds raw unreconciled bank statement lines and prohibits API-driven bank statement reconciliation**. External AI agents cannot list unreconciled feed lines or run `Find & Match`, trapping bank reconciliation inside the browser UI.

## 6. Adopt / Adapt / Defer / Reject for `dinkuskit/books`

- **Adopt:** Dual-balance bank invariant (`Statement Balance` vs. `Ledger Balance`), single append-only journal core with dynamic Cash/Accrual projection (`show_on_cash_basis`), first-class Clearing + Suspense accounts with `$0`-drift checks, `Find & Match` + `Transfers` + non-destructive `Remove & Redo`, and payment-rail-tagged `1099` tracking.
- **Adapt:** 100% parity between EmDash Admin UI and CLI/MCP for raw statement lines and bank reconciliation; native DinkusKit/Stripe payout sub-ledger splitting (eliminating A2X middleware); continuous US state nexus + quarterly estimated income-tax reserve overlay; pre-seeded Gusto GL clearing mapper.
- **Defer:** Complex B2B quote/progress-invoicing/dunning pipelines; multi-currency FX revaluation; direct IRS FIRE/IRIS transmitter accreditation.
- **Reject:** Per-month transaction caps, UI-only reconciliation silos, gated `/Journals` egress tolls, native W-2 tax-withholding engines, and custom 13,000-jurisdiction checkout rate tables.

## Sources
- https://www.xero.com/us/pricing-plans/
- https://www.xero.com/us/partnerships/gusto/
- https://central.xero.com/s/topic/0TO1N00000017VmWAI/reconcile-bank-accounts
- https://central.xero.com/s/article/Compare-the-statement-balance-and-balance-in-Xero
- https://central.xero.com/s/article/Set-up-1099-contractors-and-track-payments
- https://developer.xero.com/documentation/guides/oauth2/limits/
- https://developer.xero.com/documentation/api/accounting/manualjournals
- https://developer.xero.com/documentation/api/accounting/journals
- https://github.com/XeroAPI/xero-mcp-server
