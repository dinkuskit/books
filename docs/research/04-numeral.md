# Benchmark Research: Numeral vs. Anrok & TaxCloud

**Check Date:** `2026-10-25`  
**Primary Sources:** [Numeral Pricing](https://www.numeral.com/pricing), [Numeral Developer & MCP Docs (`v2026-03-01`)](https://docs.numeral.com/introduction), [Numeral Filing Operations Guide](https://help.numeral.com/en/articles/12020866-filing-at-numeral-everything-you-need-to-know), [Numeral Remittance & ACH Setup](https://help.numeral.com/en/articles/11020413-setting-up-your-bank-account-for-tax-remittance), [Numeral Virtual Mailbox & Notices](https://help.numeral.com/en/articles/12037015-how-numeral-handles-tax-notices-letters-and-your-virtual-mailbox), [TaxCloud Pricing](https://taxcloud.com/taxcloud-pricing/), [Sales Tax Pricing Index](https://salestaxpricingindex.org/), [Shopify Tax](https://www.shopify.com/tax), [Stripe Tax Pricing](https://stripe.com/pricing).

---

## 1. Why Modern Ecommerce Brands Pick Numeral Over TaxJar & Avalara

Numeral (`numeral.com` / `numeralhq.com`) captured fast-scaling D2C brands by wedging into the gap between **degraded SMB self-serve (TaxJar)** and **enterprise ERPware (Avalara)**:

- **Why D2C Operators Leave TaxJar:** Slashed included AutoFile credits, slow email-gated support during filing emergencies, no native permit registration or physical state mail handling, and silent AutoFile discrepancies when multi-channel marketplace deductions or product categories drift.
- **Why D2C Operators Avoid Avalara:** Opaque multi-year contracts (`$15k–$50k+/yr`), paid implementation, per-module upsells (AvaTax + Returns + CertCapture + Licensing), and third-party checkout rate overrides that add latency.

### What Numeral Automates End-to-End
1. **24/7 Nexus Monitoring (Economic + Physical + Trailing):** Audits rolling/calendar revenue and transaction counts across US sales-tax states/home-rule jurisdictions, tracks physical nexus (3PL/FBA warehouses, offices, [HR system integrations](https://docs.numeral.com/integrations/hr-systems.md) for remote hires), and tracks **Trailing Nexus** wind-down periods after nexus ends.
2. **State Permit Registrations (`Autoregister`):** Files state tax permits (`$150` flat + state fee), aligns `liability_start` dates to threshold crossings, stores portal credentials, manages 2FA forwarding (handling single-2FA state portal limits and bulk Agent Accounts), and tracks renewals.
3. **Pragmatic Rate Calculation vs. Store-Native Tax Ingestion (Crucial Lesson):**
   - **On Shopify:** Numeral [explicitly recommends keeping **Shopify Tax** as the checkout calculator](https://docs.numeral.com/integrations/shopify/shopify-tax-services.md) (native rooftop precision, zero third-party checkout latency, free under `$100k/yr` US sales then `0.25%` capped at `$0.99/order`). Numeral acts as the *configuration + back-office compliance plane*: classifying sales channels/SKUs and ingesting completed orders/refunds for multi-channel nexus and filing.
   - **On Stripe / Headless / ERPs:** Numeral either [ingests **Stripe Tax**](https://docs.numeral.com/integrations/stripe/stripe-tax.md) OR runs **Numeral's Tax Engine API** (`api.numeralhq.com`, coordinate-level rooftop accuracy, `~140ms` p95 latency) across custom checkouts, Stripe Checkout/Invoices, QBO, Xero, Rillet, and NetSuite.
4. **Automated Filing, Prepayments & True-Ups (`Autofile`):** Submits monthly/quarterly/semi-annual/annual state and local returns (including CA Schedule C location allocation, CO/LA local nuances, state prepayments, HI/MI annual true-ups, and SST returns).
5. **Physical Mail & State Notice Triage:** Built-in **Virtual Mailbox** (powered by Stable via USPS Form 1583) routes state sales-tax mail directly to Numeral's tax ops team ([source](https://help.numeral.com/en/articles/12037015-how-numeral-handles-tax-notices-letters-and-your-virtual-mailbox)), digitizing routine notices (frequency changes, rate changes, discrepancy letters) before missed deadlines become levies.
6. **On-Time Guarantee vs. Formal Audit Defense:** Standard/Professional tiers cover *notice triage, filing corrections, and platform-error penalty coverage*, **not** formal legal **Audit Defense** representation (reserved for Enterprise advisory or external SALT CPAs).

---

## 2. Pass-Through Liability & Cash Management UX

### The D2C "Phantom Cash" Failure Mode
Card processors deposit `Net Product Sales + Shipping + Collected Sales Tax - Gateway Fees` as one commingled payout into operating checking. Founders see a healthy checking balance in December without realizing tens of thousands of dollars are unremitted Q4/monthly state trust-fund taxes due January 20th—leading to accidental overspending and personal-liability officer assessments.

### How Numeral Moves Cash & Reconciles to Ledgers
1. **No FBO Escrow — Direct Per-State ACH Pulls + Dedicated Tax Sub-Account:**
   - **Numeral does NOT hold merchant funds in escrow** ([source](https://help.numeral.com/en/articles/11020413-setting-up-your-bank-account-for-tax-remittance)). When Numeral submits approved returns, **each state DOR initiates its own direct ACH debit** from the merchant's bank account (settling 5–7 business days post-approval).
   - **ACH Originator Allow-Listing:** Merchants allow-list state ACH Company/Originator IDs (e.g., CA `2822162215`, AL `MAT6045055`, AZ `9031897000`) so bank fraud filters do not bounce state pulls.
   - **Best-Practice Cash UX:** Route state ACH pulls to a **dedicated Sales Tax Reserve checking sub-account**, fed continuously by payout sweeps matching accrued liability.
2. **Order-Date / Cash-Refund Tax Timing vs. Accrual Books:**
   - Numeral recognizes sales tax when an **order is placed** and applies **refunds in the tax period the refund occurs** ([source](https://help.numeral.com/en/articles/12020866-filing-at-numeral-everything-you-need-to-know)).
   - Bookkeeping systems segregate checkout tax out of P&L revenue straight into Balance Sheet **`Sales Tax Payable` (`2100`)**.
3. **Reconciling the Two Inevitable Ledger Variances (`Tax Delta` + `Timely Filing Discounts`):**
   - State portals compute `Taxable Sales by State/County * Statutory Rate` rather than echoing `sum(cart_tax_collected)`.
   - **Variance 1 — `Tax Delta`:** Fractional-penny rounding and ZIP-vs-rooftop mismatches cause `Tax Collected != State Tax Calculated`. Numeral flags variances **`> 5%`** for investigation; minor deltas clear to `Sales Tax Rounding / Variance`.
   - **Variance 2 — Timely Filing (Vendor) Discounts:** Roughly half of US states (e.g., CO, FL, GA, NY, PA, TX) grant `~0.5%–3%` (capped) credits for filing/paying on time. Because states debit the merchant directly for the *net* amount, **the merchant retains 100% of timely filing discounts** (`DR Sales Tax Payable $10,000` -> `CR Cash $9,850` + `CR Other Income: Timely Filing Discount $150`).

---

## 3. Edge Cases Handled

| Edge Case | Best-in-Class D2C Compliance Pattern |
| :--- | :--- |
| **Multi-Channel & Marketplace Facilitators** | Channels are explicitly typed as `dtc`, `marketplace_facilitator` (Amazon, TikTok Shop, Walmart, eBay, Meta Shops, Shop App), or `wholesale` ([source](https://docs.numeral.com/integrations/shopify/shopify-sales-channels.md)). Marketplace orders count toward gross economic nexus where required, appear in Gross Sales on returns, and deduct on Marketplace Facilitator lines—preventing gross-sales audit mismatches and double-remittance. |
| **Wholesale / B2B Resale Certificates (ECM)** | Supports certificate PDF upload, state validation (`Pending` -> `Valid` / flagged), and **automated renewal reminders 90 days before expiration**. |
| **Granular D2C Product Taxability** | Combines AI SKU classification with deterministic traits ([`product-categories.md`](https://docs.numeral.com/essentials/product-categories.md)): distinguishes **Supplement Facts Panel (SFP)** vs. **Nutrition Facts Panel (NFP)** vs. **OTC Drug Facts** vs. **Cosmetics**, apparel per-item price thresholds (NY `< $110`, MA `< $175`), and `SHIPPING` vs. `SHIPPING_ACTUAL_COST` vs. `PRODUCT_INSURANCE` vs. `GIFT_CARDS`. |
| **Retroactive VDAs vs. Ongoing Cadence** | Quantifies historical uncollected tax + interest *before* registering (because self-registering on a state portal forfeits anonymous VDA penalty-waiver eligibility). |

---

## 4. Official Numeral MCP Server & Human-Gate Model

Numeral (`https://mcp.numeralhq.com/mcp`) is a strong reference for side-by-side Admin UI + Agent MCP design ([MCP Overview](https://docs.numeral.com/mcp/overview.md), [MCP Tools](https://docs.numeral.com/mcp/tools.md)):
- **Read-Only Default Tool Envelope (14 Tools):** `list_merchants`, `get_merchant`, `get_nexus_study`, `list_registrations`, `list_filings`, `get_filing`, `list_transactions`, `get_transaction`, `get_sales_summary`, `list_products`, `list_tax_categories`, `list_certificates`, `get_certificate`, `get_certificate_upload_status`.
- **Agent-Safe Data Conventions:** Money values serialized cleanly without IEEE-754 float drift, uppercase ISO jurisdictions (`US-CA`), cursor pagination, and structured `{ error_code, error_message }`.
- **Server-Hidden Write Gate:** Write tools are **disabled by default and omitted from `tools/list`** unless explicitly enabled.
- **Monthly Human Review Window (1st–10th):** Channels sync 1st–4th; draft returns land by the 5th; human review window runs **5th–10th** (`Safe-Autopilot` auto-approves at 10th 11 PM PST, or `Auto-Approval Lock` enforces strict human sign-off). New state registrations, VDAs, and audit/levy responses remain strictly human-gated.

---

## 5. Pricing & Target Merchant Tier Comparison (`2026-10-25`)

| Platform | Base Platform Fee | Calculation / Tx Fee | Filing & Registration Fees | Ideal Merchant Profile |
| :--- | :--- | :--- | :--- | :--- |
| **Numeral** ([pricing](https://www.numeral.com/pricing)) | **`$0/mo`** (Monitoring & Professional) | **`$0`** on store-native calc | **`$75 / return`** (all states, incl. SST)<br>**`$150 / registration`** | Fast-growing D2C & multi-channel brands (`$1M–$50M+` GMV) wanting concierge ops + virtual mailbox without `%` revenue share. |
| **TaxCloud** ([pricing](https://taxcloud.com/taxcloud-pricing/)) | **`~$199/yr – $2,000+/yr`** tiered by order volume | **`$0`** `%` fee | **`$0` filing & `$0` reg in 24 SST states** (eligible remote sellers on Premium); **`~$39–$45/return`** non-SST | Cost-conscious US physical-goods D2C brands in 10–35 states maximizing **SST state-subsidized free filings**. |
| **Anrok** | **`~$50–$100/mo` per active jurisdiction** + volume tiers | Bundled up to tier cap, then `%` of revenue | Bundled into monthly per-market fee | **SaaS, AI, & digital subscription** companies needing seat-splitting and global VAT/GST. Overpriced for physical D2C. |
| **Shopify Tax / Stripe Tax** | `$0` base | **Shopify Tax:** Free `< $100k/yr`, then `0.25%` (`$0.99` cap)<br>**Stripe Tax:** `0.5%` uncapped (Basic) | Separate per-return filing partner fees | **Checkout calculation engines**, not standalone accounting ledgers. |
| **DIY State Portals** | **`$0`** | **`$0`** (uses store native tax) | **`$0` filing** (state reg fees `$0–$100` one-time) | **1–5 states** early D2C (`< $1.5M` GMV) *if* bookkeeping software produces exact pre-computed state/county worksheets + cash reserves. |

---

## 6. Adopt / Adapt / Defer / Reject for `dinkuskit/books`

### ADOPT
1. **True Spendable Cash Header & Tax Sweep Suggestions:** Deduct unremitted `2100.*` Sales Tax Payable from operating checking in the primary cash view and generate payout/weekly transfer previews into a dedicated Tax Reserve sub-account.
2. **Dual-Clock, Channel-Typed Tax Sub-Ledger (`tax_ledger_entries`):** Stamp `jurisdiction_id` (`US-CA`), `channel_type` (`dtc | marketplace_facilitator | wholesale_exempt`), minor-unit amounts (`gross`, `exempt`, `taxable`, `tax_collected`), `exemption_reason`, and dual timestamps (`ordered_at`, `fulfilled_at`, `refunded_at`).
3. **4-Way State Remittance Clearing (`Tax Delta` + `Timely Filing Discount` + `ACH Originator ID` Matcher):** Match state DOR ACH pulls via seeded ACH Company IDs, clear `2100.<STATE>`, book timely-filing discounts to `Vendor Tax Compensation`, and flag `Tax Delta > 5%`.
4. **Multi-Channel Nexus Radar + VDA Exposure Warning:** Track rolling-12m / calendar-year thresholds + physical/trailing nexus flags, and warn before self-registering if nexus was crossed `> 60` days ago with uncollected tax.
5. **5-Minute Monthly Tax Close Checklist (1st–10th) + Zero-Migration Provider Seams:** Generate copy-paste state portal worksheets for `diy_portal` states AND deterministic Numeral / TaxCloud CSV/API exports + tie-out checks when scaling to `10–20+` states.

### ADAPT
- **Lightweight SKU Tax-Trait Metadata & Customer Resale Cert Vault:** Store optional compliance traits (`supplement_facts | nutrition_facts | drug_facts | none`, provider tax code) and customer resale PDF attachments + 90-day expiry warnings without building a rate engine.

### DEFER
- Direct state portal RPA/EDI AutoFile & SST CSP certification; USPS Form 1583 virtual mailbox ops (provide a local `Tax Notices` PDF inbox instead).

### REJECT
- Building a real-time checkout rooftop rate calculator inside `books`; holding merchant funds in FBO escrow; autonomous agent state registration or tax return submission without a human gate.
