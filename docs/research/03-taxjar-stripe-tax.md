# Benchmark Research: TaxJar & Stripe Tax

**Check Date:** `2026-10-25`  
**Primary Sources:** [Stripe Tax Docs](https://docs.stripe.com/tax), [Filing with Stripe](https://docs.stripe.com/tax/file-with-stripe), [Stripe Tax Monitoring](https://docs.stripe.com/tax/monitoring), [Stripe Customer Tax Exemptions](https://docs.stripe.com/tax/exemptions), [Stripe Tax Reports](https://docs.stripe.com/tax/reports), [Stripe Balance Transactions](https://docs.stripe.com/api/balance_transactions), [Stripe Pricing](https://stripe.com/pricing), [TaxJar API v2](https://developers.taxjar.com/api/reference/), [TaxJar Pricing](https://www.taxjar.com/pricing), [TaxJar US Economic Nexus Guide](https://www.taxjar.com/sales-tax/economic-nexus).

---

## 1. Architectural Split — Checkout Calculation vs. Post-Checkout Liability & Filing

Following Stripe's acquisition of TaxJar, Stripe kept **two distinct architectures** connected only at the US filing layer:

| Layer | **Stripe Tax** (`docs.stripe.com/tax`) | **TaxJar** (`taxjar.com` / `developers.taxjar.com`) |
| :--- | :--- | :--- |
| **Primary Anchor** | **Checkout & billing calculation engine** embedded natively in Stripe Checkout, Payment Links, Invoices, Subscriptions, and Custom payment flows (`/v1/tax/calculations`). | **Post-checkout multi-channel compliance & filing hub** ingesting completed orders/refunds across carts & marketplaces (`/v2/transactions/*`), plus US SmartCalcs (`POST /v2/taxes`). |
| **Geographic Scope** | **Global (100+ countries)** — US sales/use tax across 13,000+ jurisdictions, plus EU/UK VAT, OSS, CA GST/HST/PST/QST, AU/NZ/SG/JP GST/JCT. | **US-only** — specialized in US state & sub-state local district reporting and state DOR filing formats. |
| **Address & Sourcing** | Rooftop geocoding + 9-digit ZIP/GIS boundary resolution; statutory **origin vs. destination** sourcing rules + 500+ Product Tax Codes (`txcd_*`). | Rooftop/street + 5/9-digit ZIP resolution; returns `tax_source: "origin" \| "destination"` and FIPS/jurisdiction breakdown. |
| **Liability Subledger** | Immutable **accrual** ledger (`tax.transaction` + `tax.itemized_export.1` report) recorded when checkout completes or `create_from_calculation` is called. | Mutable transaction store (`orders` + negative `refunds`) feeding **Actual Sales Tax Collected** vs. **Expected Sales Tax Due**. |
| **Reports API Gap** | Full programmatic CSV exports via `/v1/reporting/report_runs`. | **NO `/v2/reports` endpoint** — sub-state jurisdiction filing reports are UI/XLS-only. |

### Basis Difference: Standalone TaxJar AutoFile vs. Embedded Stripe Tax Filing
- **Standalone TaxJar AutoFile** files using **Expected Sales Tax Due** — if an imported order had `$0` tax collected and lacked an `exemption_type` or exempt `product_tax_code`, TaxJar assumes the sale was taxable and remits expected tax out of the merchant's bank account.
- **Stripe Tax Automatic Filing** files based on **actual tax collected** on Stripe Tax–enabled transactions (plus CSV imports), adjusting for state prepayments, timely-filing discounts, rounding rules, and current-period refunds.

---

## 2. Economic Nexus & Filing Cadence Mechanics (2025–2026 Landscape)

1. **Dollar & Transaction Prongs (and the `200`-Transaction Repeal Wave):**
   - **Standard baseline:** `$100,000` in sales.
   - **High-threshold states:** **CA** (`$500,000` gross), **TX** (`$500,000` gross), **NY** (`$500,000` gross **AND** `100` transactions), **AL / MS** (`$250,000`).
   - **Repeal wave:** States have rapidly repealed the `OR 200 transactions` prong (including AK eff. Jan 2025, UT eff. Jul 2025, IL eff. Jan 2026, KY eff. Aug 2026, joining CA, CO, IA, IN, LA, ME, NC, ND, SD, WA, WI, WY).
2. **Revenue Basis (`Gross` vs. `Retail` vs. `Taxable`):**
   - States such as **AZ, CA, IN, NC, TX** measure **gross sales** (including wholesale/resale-exempt and non-taxable product sales), which can trigger registration and mandatory `$0` information returns even for exempt sellers.
3. **Lookback Windows:** Prior/current calendar year (CA, SD, UT, WY), rolling preceding 12 calendar months (IL, MN, TN, TX), or preceding 4 sales-tax quarters (NY).
4. **Stripe Tax Monitoring Blind Spot:** Stripe's native threshold monitor **cannot distinguish marketplace vs. direct sales or wholesale vs. retail sales** ([docs](https://docs.stripe.com/tax/monitoring)).
5. **Statutory Cutoffs & Due Dates:** Evaluated in the **state's local timezone** (not UTC); due on the **15th** (ME), **20th** (~30+ states including TX, NY, FL, GA, IL, NC, TN, PA, VA), **23rd/25th** (OH, WA, KS, VT), or **End of Month** (CA, WI, NV). Once registered, **`$0.00` zero-returns are mandatory every assigned period**.

---

## 3. Wholesale Exemptions, Refunds & Shipping Taxability

- **State-Scoped Exemptions & Missing Certificate Vault:**
  - TaxJar supports `exempt_regions` per state (omitting `exempt_regions` accidentally marks a buyer exempt in all 50 states!). Stripe's `/v1/customers/:id/tax_exemptions` supports US state-scoped exemptions (`effective_date`, `expiration_date`), unlike legacy global `customer.tax_exempt`.
  - **Neither Stripe Tax nor TaxJar collects, validates, or stores physical/PDF resale certificates** (`MTC_UNIFORM`, `SST`, or state-specific forms like FL's annual Dec 31 expiry). Audit liability stays 100% on the merchant.
- **Refund-Date Attribution & Negative Period Carryforward:**
  - Both Stripe Tax (`create_reversal`) and TaxJar deduct refunded tax in the **filing period when the refund occurred**, never mutating closed prior periods.
  - Because state portals reject negative returns, excess refund periods carry a **negative balance forward** (`Sales Tax Credit Carryforward`) into the next filing period.
- **Discounts & Mixed-Cart Shipping:**
  - Retailer-funded coupons reduce the pre-tax base proportionally; Separately-stated shipping (`txcd_92010001`) is exempt in states like CA/FL/AZ/MA/VA, whereas combined "Shipping & Handling" (`txcd_92010000`) often forfeits the exemption. Mixed taxable/exempt carts allocate shipping proportionally.

---

## 4. Critical `BalanceTransaction` <-> `Tax.Transaction` Payout Gotchas

1. **`BalanceTransaction` Has NO Customer `amount_tax` Field:** `/v1/balance_transactions` records `amount` (gross captured = items + shipping + tax), `fee`, and `net`. (`type == "tax_fee"` is tax on Stripe's own fee, **not** customer sales tax!)
   - **Join Path:** `po_...` -> `txn_...` -> `source` (`ch_...` / `re_...`) -> `payment_intent` (`pi_...`) -> `tax.transaction` / `Checkout.Session`.
2. **Processing Fee-on-Tax Asymmetry:** Stripe charges `2.9% + $0.30` on the **entire gross charge including sales tax**. On `$100.00` item + `$10.00` tax (`$110.00`), Stripe's `$3.49` fee includes `$0.29` charged on the tax. The merchant nets `$9.71` of cash for tax, **but owes the state the full `$10.00`**. Therefore, 100% of `$3.49` must post to `Merchant Processing Fees` while crediting `Sales Tax Payable — US-<STATE>` for the full `$10.00`.

---

## 5. Pricing Matrix (`2026-10-25`)

| Offering / Tier | Base Subscription | Calculation / Transaction Fee | Filing / Registration Fees |
| :--- | :--- | :--- | :--- |
| **Stripe Tax Basic** | `$0/mo` | `0.5%` per txn (no-code) or `$0.50/txn` (Custom API) | Self-file exports or pay partner rates |
| **Stripe Tax Complete** | `$90/mo` (200 txns) to `$430–$1,500/mo` | `$0.48–$0.50/txn` overage | 4–12 filings/yr included; extra billed via credits |
| **TaxJar Starter** | `$39/mo` (up to 200 orders/mo) | Order-tier auto-scaling (no SmartCalcs API) | 2 AutoFiles/yr included, then **`$50 / return`** |
| **TaxJar Professional** | `$99/mo` (up to 200 orders/mo) | Includes SmartCalcs API + XLS sub-state export | 4 AutoFiles/yr included, then **`$55 / return`** |

> **Cost Cliff:** Filing monthly in 8 states (`96 returns/yr`) costs **`$4,800–$5,280/yr`** in AutoFile fees alone—even in off-peak months owing `$0`.

---

## 6. Adopt / Adapt / Defer / Reject for `dinkuskit/books`

- **ADOPT:** Immutable post-checkout tax subledger (`state/county/city/district` breakdown from checkout snapshot) + `Processor Clearing` decomposition (100% fee to Expense, 100% collected tax to `Sales Tax Payable — US-<STATE>`); refund-date reversals + `Sales Tax Credit Carryforward`; explicit `marketplace_facilitator` pass-through segregation.
- **ADAPT:** Channel- and exemption-aware `nexus_watch` rule table (fixing Stripe Monitoring's marketplace/wholesale blind spots); state-scoped `tax_exemption_certificates` PDF vault in EmDash CAS with expiry gates; state-local-timezone **Monthly Return-Prep & Remittance Reconciliation Worksheet**.
- **DEFER:** Direct state portal EDI/API submission and non-US VAT OSS multi-currency filing.
- **REJECT:** Building an in-house 13,000-jurisdiction rooftop GIS rate engine; global-only `is_tax_exempt` booleans; retroactive refund mutation of closed periods.
