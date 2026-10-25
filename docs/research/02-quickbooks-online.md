# QuickBooks Online (QBO / Intuit) Competitive & CPA Benchmark

**Check Date:** `2026-10-25`

## 1. The US CPA Year-End Handoff Contract

US CPAs default to QuickBooks Online because **QuickBooks Online Accountant (QBOA)** standardizes *Prep for Taxes* into **Intuit ProConnect / Lacerte**, **Thomson Reuters UltraTax CS**, and **Wolters Kluwer CCH Axcess** in 1–3 hours rather than 10–25+ hours of bank-PDF reconstruction.

### Exact Year-End Deliverables Required for Zero-Friction CPA Handoff
1. **Comparative Balance Sheet (`12/31/YYYY` vs. `12/31/YYYY-1`):** Must balance `Assets == Liabilities + Equity` to `$0.00` and prove **Retained Earnings roll-forward** (`prior ending equity + prior return adjustments == current beginning equity`).
2. **12-Month Columnar & Comparative Profit & Loss:** Monthly columns (`Jan–Dec` + Total + Prior Year) so CPAs immediately spot missing monthly expenses, negative balances, or misclassified capital assets.
3. **Working Trial Balance (WTB) / Adjusted Trial Balance CSV:** Flat, unmerged CSV (`AccountNumber`, `AccountName`, `AccountType`, `PriorYearAdjustedBalance`, `UnadjustedDebit`, `UnadjustedCredit`, `AdjustingEntries (AJE)`, `AdjustedDebit`, `AdjustedCredit`, `TaxLineCode`), isolating CPA year-end entries via an explicit `IsAdjustment` flag.
4. **Un-truncated General Ledger (GL) Detail CSV:** Every posting line (`01/01–12/31`) with `TxnId`, `TxnDate`, `TxnType`, `DocNumber`, `PayeeName`, `AccountNumber`, `AccountName`, `SplitAccount`, `Memo`, `Debit`, `Credit`, `RunningBalance`, `ReconcileStatus` (`"" | "C" | "R"`), and content-addressed receipt attachment link/hash.
5. **Fixed Asset Additions & Dispositions CSV (`Form 4562` / `Form 4797` Bridge):** Standard QBO tiers (`Simple Start`, `Essentials`, `Plus`) do **not** calculate MACRS/§179/Bonus depreciation—CPAs maintain `Form 4562` inside ProConnect/UltraTax/CCH. Books must cleanly isolate purchases above the **`$2,500` de minimis safe harbor (`Treas. Reg. §1.263(a)-1(f)`)**, export an import-ready Additions/Dispositions CSV (`AssetId`, `Description`, `Vendor`, `DateAcquired`, `DatePlacedInService`, `CostBasis`, `AssetCategory`, `DateDisposed`, `SaleProceeds`, `InvoiceHash`), and accept the CPA's annual Depreciation AJE.
6. **Entity Tax-Line Mapping & Book-to-Tax (`M-1`) Tags:** Map accounts to `Schedule C`, `Form 1065`, `Form 1120-S` (isolating Line 7 Officer Compensation, >2% shareholder health insurance, distributions, and Schedule K items), or `Form 1120`, plus `M-1` permanent/temporary tags (50% deductible meals, nondeductible penalties).
7. **`12/31` Statement Reconciliation Certificates + Uncleared Aging + `1099-K` Gross-to-Net Tie-Out.**

### Period-Lock & Audit-Log Invariants
- **Period Lock (`Close the Books`):** Hard `ClosingDate` gate blocking edits/deletes on or before the closed period unless recorded via an audited CPA `IsAdjustment` or signed reopen, paired with a dedicated **Closing Date Exception Report**.
- **Immutable Audit Log:** Non-deletable append-only log tracking actor, timestamp, event, and before/after field diffs.

## 2. Two-Stage Bank Feed & Formal Statement Reconciliation

1. **Stage 1 — Feed Staging (`For Review`):** Off-ledger queue proposing `Categorize (Add)`, `Match` (link to existing ledger item), or `Record as Transfer / Credit Card Payment` (Balance-Sheet-to-Balance-Sheet, preventing doubled income/expenses).
2. **Stage 2 — Formal Monthly Statement Reconciliation (`Blank` -> `"C"` Cleared -> `"R"` Reconciled):** Seals transactions against official statement `BeginningBalance`, `EndingBalance`, and `StatementEndingDate` requiring `(BeginningBalance + ClearedDeposits - ClearedPayments) - StatementEndingBalance == $0.00`. Flags >60-day stale uncleared items and beginning-balance drift.
- **QBO Anti-Pattern to Reject:** QBO's `"Finish Now"` escape hatch fabricates a plug to `Reconciliation Discrepancies`, and undoing one historical month destructively cascades across later months.

## 3. Dual-Basis Engine & The Solopreneur vs. Core QBO Chasm

- **Single Double-Entry Core:** Dynamic `Cash` vs. `Accrual` projection walks `LinkedTxn` payment-settlement graphs at query time without duplicating ledgers.
- **The Solopreneur Cliff:** QBO Solopreneur (`$20/mo`) includes rolling quarterly estimated income/SE tax (`1040-ES`) but is **single-entry with no Balance Sheet, no sales tax, and no COGS**. Upgrading to QBO Simple Start/Plus (`$38–$140/mo`) gives double-entry and sales tax—**and completely removes continuous quarterly estimated income-tax tracking**.
- **Ecommerce Q4 Tax Traps in QBO:** `1099-K` gross vs. net bank deposit mismatches (triggering IRS CP2000 notices when net payouts are booked as `Sales`), Dec 28–31 in-transit payouts, Q4 unsold inventory pre-buys (`IRC §471(c)` cash spent != immediate COGS deduction), gift card deferred revenue (`IRC §451(c)`), sales tax booked as revenue, and capital-advance holdbacks.

## 4. `1099` Contractors vs. W-2 Payroll

- **Native `1099-NEC` / `1099-MISC` + IRS IRIS:** Digital W-9 capture, automatic exclusion of credit-card/processor (`1099-K`) rails so only ACH/check/wire/cash count toward `1099-NEC`/`1099-MISC` (`$600` TY2025; **`$2,000` TY2026+ under OBBBA**), and free bulk CSV template compatibility with the **IRS IRIS Portal** (mandated at `>= 10` combined information returns).
- **W-2 Payroll Boundary:** QBO Payroll (`$50–$134/mo + $6.50–$17/emp`) pollutes the GL with per-employee paychecks and exposes individual salaries. CPAs prefer **external Gusto Summary Journal Sync**: one balanced summary entry per pay run (`Officer Wages`, `Staff Wages`, `Employer Payroll Taxes`, `Benefits` -> `Payroll/Tax Clearing` matching bank ACH debits 1-to-1).

## 5. Pricing, Asymmetric `CorePlus` API Metering & MCP

- **Pricing (Aug 2026):** Solopreneur `$20/mo`, Simple Start `$38/mo`, Essentials `$85/mo`, Plus `$140/mo`, Advanced `$340/mo` (full ecommerce stack `$240–$350+/mo`).
- **Asymmetric Data-Out Exit Tax (July 2025+):** Intuit's Partner Program leaves Data-In (`Core` writes) free while metering Data-Out (`CorePlus` reads and reports: Builder capped at 500k calls, paid tiers `$300–$4,500/mo`) and banning external AI assistants on partner data.
- **MCP Limits:** Official `intuit/quickbooks-online-mcp-server` wraps live CRUD entities directly without staged review queues, reconciliation workflows, or unmetered read access.

## 6. Adopt / Adapt / Defer / Reject for `dinkuskit/books`

- **Adopt:** One-click `cpa-pack` ZIP (WTB with `IsAdjustment` & entity tax-line codes, Cash/Accrual comparative statements, un-truncated GL CSV + hashed receipts, `Form 4562` additions CSV, `1099-K` gross-to-net bridge), strict `Blank -> C -> R` statement reconciliation (`$0.00` diff enforced), hard `CloseDate` + Closing Exception report, and IRS IRIS `1099` CSV export + Summary Payroll Journal ingestion.
- **Adapt:** Combine QBO Solopreneur's rolling `1040-ES` income-tax estimator with a full double-entry ecommerce ledger; expose **staged Propose -> Verify -> Commit** changesets over CLI/MCP instead of raw live-ledger mutation.
- **Defer:** In-house MACRS/`Form 4562` depreciation math; direct state sales-tax portal transmission.
- **Reject:** Native W-2 payroll calculation/impounding, `Reconciliation Discrepancies` auto-plugs, single-entry "lite" mode, and Data-Out API metering.

## Sources
- https://quickbooks.intuit.com/pricing/
- https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/profitandloss
- https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/generalledger
- https://quickbooks.intuit.com/r/news/app-partner-program-drives-growth/
- https://github.com/intuit/quickbooks-online-mcp-server
- https://www.irs.gov/tax-professionals/e-file-information-returns-with-iris
- https://www.irs.gov/forms-pubs/about-publication-1099
