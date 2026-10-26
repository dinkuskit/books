# Gusto Payroll & `1099` Contractor Compliance Benchmark

**Check Date:** `2026-10-25`

## 1. W-2 Payroll Compliance Reality Check

Operating W-2 payroll is running a regulated multi-jurisdiction tax agency and custodial money transmitter:
- **Multi-Layer Withholding:** Federal (`Pub 15-T` / `W-4`), 41+ state regimes (work vs. residence reciprocity), and **~5,000+ local/municipal/school-district/transit taxes** (PA PSD codes, OH cities/school districts, NYC/Yonkers, OR transit, WA Cares/PFML).
- **FICA (`IRC §§ 3101, 3111`):** `6.2%` EE + `6.2%` ER Social Security up to **`$184,500` (2026 wage base)**, `1.45%` EE + `1.45%` ER Medicare uncapped, plus `0.9%` Additional Medicare employee withholding above `$200,000`.
- **FUTA & SUTA:** `0.6%` net FUTA (`Form 940`, plus FUTA Credit Reduction state surcharges) and employer-specific experience-rated state SUTA/UI + SDI/PFML.
- **Garnishments & New-Hire Reporting:** 20-day PRWORA State Directory of New Hires reporting and CCPA Title III child-support/garnishment priority stacking.
- **Custodial Float, MTLs & Veil-Piercing Liability (`IRC § 6672`):** Impounding payroll taxes into FBO trust accounts requires FinCEN MSB + ~50 state Money Transmitter Licenses and IRS `Form 8655`. Under **`IRC § 6672` (Trust Fund Recovery Penalty)**, withheld FIT and employee FICA carry **100% personal, non-dischargeable veil-piercing liability** if miscalculated or unremitted.
- **S-Corp Owner Nuances:** Active `>2%` shareholder-employees require reasonable W-2 compensation (`IRC § 3121`), `SEP-IRA` employer contributions cap at **`25%` of W-2 wages** (zero credit for K-1 distributions), and `>2%` shareholder health insurance (`Notice 2008-1`) must be imputed into W-2 Box 1 + Box 14 while excluded from Boxes 3 & 5 (FICA).

## 2. `1099-NEC` / `1099-MISC` Contractors vs. W-2 Payroll

Contractor tracking is pure **AP ledger metadata + annual information reporting** (zero per-paycheck tax withholding, zero FBO trust float, zero MTLs):
- **Onboarding & Category-Specific Corporate Exemptions:** Capture `Form W-9` and evaluate the C-Corp / S-Corp exemption **by payment category and statutory box**—never as a blanket vendor-wide suppression—preserving reportable payments to corporations including **medical and health care payments** (`1099-MISC` Box 6, `Treas. Reg. § 1.6041-3(p)(1)`), **attorneys' fees** (`1099-NEC` Box 1) and **gross proceeds paid to an attorney** (`1099-MISC` Box 10, `IRC § 6045(f)`), **substitute payments in lieu of dividends or tax-exempt interest** (`1099-MISC` Box 8, `IRC § 6045(d)`), **cash purchases of fish for resale** (`1099-MISC` Box 11, `IRC § 6050R`), and **federal executive agency service payments** (`IRC § 6041A(d)(3)`).
- **2026 OBBBA Thresholds (By Form & Box) vs. State Non-Conformity:** Under OBBBA (`IRC §§ 6041, 6041A`), the general federal threshold for `1099-NEC` Box 1 nonemployee compensation (including direct legal-service fees) and general `1099-MISC` boxes (Box 1 rents, Box 3 other income, Box 6 medical/health care payments) rose from `$600` (`TY2025`) to **`$2,000` starting Tax Year 2026** (inflation-indexed after `TY2026`). **However, lower statutory federal thresholds remain unchanged**—specifically **`$10`** for `1099-MISC` Box 2 royalties (`IRC § 6050N`) and Box 8 broker substitute payments (`IRC § 6045(d)`), **`$600`** for `1099-MISC` Box 10 gross proceeds paid to an attorney (`IRC § 6045(f)`) and other statutory boxes outside `§§ 6041/6041A`, and **`$0.01+` (any amount)** whenever federal income tax is backup-withheld in Box 4 (`IRC § 3406`)—and **several states still require state `1099` reporting at `$600`**. Track vendor disbursements by form and box from `$0.01` and collect `W-9` before first payment (or well ahead of applicable `$10` / `$600` thresholds).
- **Payment-Rail Exclusion (`IRC § 6050W`):** Automatically include `ach | check | wire | cash` and exclude `card | stripe | paypal | venmo_business` (reported by processors on `1099-K`).
- **Free IRS IRIS CSV E-File:** `10+` combined returns (`W-2` + `1099`) mandate electronic filing (`TD 9972`); IRS **IRIS Portal** accepts free official CSV bulk uploads by Jan 31 (`1099-NEC`) / Mar 31 (`1099-MISC`).

## 3. Gusto <-> Ledger Accounting Sync Mechanics

Gusto's `totals` schema splits company cash pulls into exact ACH legs (`PPD ID: 9138864003`):
- **Balanced Payroll Journal Entry on `check_date`:**
  - **Debits (P&L Expenses):** `Gross Wages` (by department / separating S-Corp `Officer Wages`), `Employer Payroll Taxes`, `Employer Benefits / Retirement Match`, `Employee Reimbursements`.
  - **Credits (Current Liabilities):** `2110 · Payroll Clearing — Net Pay` (`net_pay_debit`), `2120 · Payroll Clearing — Tax Impound` (`tax_debit`), `2130 · Payroll Clearing — Reimb. & Child Support`, plus `401(k) / Health Payable`.
- **Bank Statement Reconciliation:** Incoming bank-feed ACH debits (`GUSTO NET`, `GUSTO TAX`, `GUSTO REIMB`) match 1-to-1 against their clearing accounts, zeroing every clearing balance to **`$0.00`**, while the monthly `GUSTO FEE` debit codes directly to SaaS expense.

## 4. Pricing & Gusto API / CLI / MCP Reality

- **Pricing:** Gusto Simple `$49/mo + $6/person`, Plus `$80/mo + $12/person`, Contractor-Only `$35/mo + $6/contractor` (Xero/QBO charge **`$0` extra** for the accounting integration itself; Xero resells Gusto at `$36/mo + $6/person`).
- **Partner Gate vs. Official `gusto-cli` & `gusto-mcp`:**
  - **Gusto Embedded API** (commercial PEPM minimums + closed SDK) and **Gusto App Integrations REST API** (mandatory SOC 2 Type 2 / GRC Pre-Approval; explicitly rejects early-stage products and self-connecting customers) are partner-gated.
  - **Breakthrough for Human + Agent Co-Op:** Gusto now ships official customer-facing **`gusto-cli`** (`gusto.com/product/integrations/gusto-cli`) and **`gusto-mcp`** (`mcp.api.gusto.com`) alongside zero-gate **General Ledger Mapper CSV** exports—allowing an operator's agent to pull payroll runs directly and stage balanced `PayrollRunImport` journals into `dinkuskit/books` on Day 1 with zero partner gate!

## 5. Architectural Verdict for `dinkuskit/books`

- **REJECT Native W-2 Payroll Engine (Option A):** Existential `IRC § 6672` personal liability, ~50 state MTLs, and 5,000+ local tax tables for zero differentiation against a `$49/mo` commodity.
- **ADOPT Native `1099` Vendor Module + 3-Lane `PayrollRunImport` Clearing Bridge in `books` (Option B):**
  1. Native `1099-NEC` / `1099-MISC` vendor compliance (masked TIN/vault ref, `W-9` status, form/box/year-specific federal thresholds—`$2,000` `TY2026+` general `§§ 6041/6041A`, `$10` Box 2 royalties / Box 8 substitute payments, `$600` Box 10 attorney gross proceeds, `$0.01+` Box 4 backup withholding—plus `$600` non-conforming state flags, `payment_rail` `1099-K` exclusion, and IRS IRIS CSV export).
  2. Provider-agnostic `PayrollRunImport` schema + zero-balance **Payroll Clearing Health Card** fed via: (Lane 1) drag-and-drop Gusto GL CSV in EmDash Admin, (Lane 2) side-by-side agent sync via `gusto-cli` / `gusto-mcp` -> `books payroll import`, and (Lane 3) optional hosted Cloud OAuth/webhook relay later.
- **DEFER Separate `dinkuskit/payroll` Plugin; Lock Boundaries Now (Option C):** Never store employee SSNs, `W-4`s, or bank routing numbers inside `books`; any future payroll integration emits idempotent `PayrollRunImport` journals + `ExpectedBankDebit` match hints.

## Sources
- https://gusto.com/product/pricing
- https://docs.gusto.com/app-integrations/docs/introduction
- https://docs.gusto.com/app-integrations/docs/security-review
- https://docs.gusto.com/embedded-payroll/docs/payroll-fundamentals
- https://docs.gusto.com/app-integrations/reference/post-payrolls-payroll_uuid-reports/general_ledger
- https://gusto.com/product/integrations/gusto-cli
- https://gusto.com/product/integrations/gusto-mcp
- https://www.irs.gov/forms-pubs/about-form-1099-nec
- https://www.irs.gov/instructions/i1099mec
- https://www.irs.gov/filing/e-file-forms-1099-with-iris
- https://www.irs.gov/businesses/small-businesses-self-employed/s-corporation-compensation-and-medical-insurance-issues
