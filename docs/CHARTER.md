# DinkusKit Books — Charter

Recorded from GrillTrack Cycle 1 on `2026-10-25` (`gt-20261025142221-8223a4`).  
Durable decision ledger: [`.grilltrack/ledger.json`](../.grilltrack/ledger.json).  
Competitive benchmark pack: [`docs/research/README.md`](research/README.md).

Business-sensitive tenant figures, bank/card identifiers, tax filings, and private operating rationale live outside this repository and are deliberately never committed here.

## Reading this design

The public [DinkusKit vision](https://github.com/dinkuskit/.github/blob/36aab690a7ef66dc119aab70e258ea979c54841a/VISION.md)
and [scope and planning](https://github.com/dinkuskit/.github/blob/36aab690a7ef66dc119aab70e258ea979c54841a/ROADMAP.md)
provide context for the six locked decisions below. This is an accepted design,
not a report of implemented or installed Books capabilities, a release schedule,
or authorization to start every designed workflow. Implementation slices need
their own explicit scope and proof.

Standalone adoption and portable CPA export remain the Books contract. An
optional first-party assistant and a merchant's chosen assistant use the same
supported interfaces and permissions, starting read-only. A business can have
several sites and people helping its accountable operator; that does not add
cross-site consolidation to this design. Shared business/site knowledge and
authorized site overrides need a separate storage and permission design.
Private conversations do not automatically become shared business knowledge
or public research material.

Use [selective research guidance](https://github.com/saariuslystoned/SaariusSkills/blob/23f2bb1208b3baa7aedaa87faec00395f9bdd061/skills/emdash-commerce/SKILL.md)
for a material unresolved question. Keep research findings, locked decisions,
and active work distinct; do not rewrite the decision ledger by hand.

---

## `d1-deployment-and-data-boundary` — Standalone EmDash Plugin + Open County Tax Engine (locked)

`@dinkuskit/books` is the open-source bookkeeping, reconciliation, and continuous tax-readiness ledger **for any EmDash site**—with **zero hard dependency on `@dinkuskit/commerce`**:

1. **Standalone Core (Any EmDash CMS Site):** Agencies, studios, creators, consultants, service businesses, and non-store entities can install `@dinkuskit/books` on local SQLite or hosted EmDash without installing storefront, cart, or shipping plugins. Ledger entries, statement lines, and tax schedules live in plugin-namespaced tables, with EmDash CAS media storing receipts and tax documents.
2. **Optional Commerce Stack Adapters:** When `@dinkuskit/commerce`, `@dinkuskit/payments`, or `@dinkuskit/ship` are present on the same EmDash site, optional adapters activate automatically to decompose order sales, collected sales tax, processor batches/payouts, and shipping postage.
3. **Decoupled Open-Source US County & State Sales-Tax Schedule Package:** The jurisdiction lookup (`Address -> State / County / City / Special District FIPS`) and state county-schedule generator are architected as a clean, framework-agnostic open-source library usable standalone by external builders and AI agents even outside EmDash.
4. **Zero Lock-In (`cpa-pack`):** Every site can export a 1-click **`cpa-pack` ZIP** (`Cash & Accrual P&L`, `Balance Sheet`, `Working Trial Balance`, `General Ledger CSV`, `Statement Reconciliation Certificates`, `Form 4562` asset additions, `1099` summary, and `1099-K` gross-to-net bridge).

---

## `d2-bank-feeds-and-reconciliation` — Multi-Processor Clearing & Zero-Lock-In Bank Feeds (locked)

`@dinkuskit/books` replaces traditional SaaS bank reconciliation without requiring a vendor-hosted Plaid credential proxy or locking stores to a single payment gateway:

1. **Bank & Card Ingestion (`$0` / `$15/yr` User-Direct):**
   - **Free (`$0`):** Idempotent `CSV / OFX / QFX` statement uploads (4-tier deduplication + balance assertions) and direct read-only bank/processor API tokens where supported (e.g., Mercury, Stripe).
   - **Optional Live Bank & Credit-Card Feeds (`$15/yr` user-paid directly to SimpleFIN):** Users connect checking and business credit cards (up to 25 MX-backed institutions) at `simplefin.org` and paste a read-only token into `@dinkuskit/books` settings (`$0` vendor cost, `$0` markup, zero DinkusKit billing middleman).
2. **Processor-Agnostic Settlement Clearing (`Stripe` + `Authorize.Net` + Future Providers):**
   - Supports **net-fee payout gateways** (e.g., Stripe `payout_id`, where processing fees, refunds, disputes, and reserves are netted before bank deposit) **and gross-batch gateways** (e.g., **Authorize.Net** `batchId` via `getSettledBatchList` / `getTransactionDetails` and high-risk merchant acquirers where gross batches hit checking and merchant fees debit separately), as well as future `@dinkuskit/payments` providers.
3. **Dual-Balance Statement Reconciliation:** Enforces Xero/QBO-grade `Statement Balance` vs. `Ledger Balance` tie-outs (`Blank -> Cleared -> Reconciled` with a strict `$0.00` difference check—never auto-plugging discrepancies to `Opening Balance Equity`) and non-destructive `Remove & Redo` reversals.

---

## `d3-accounting-basis-and-cogs` — Simple `Cash | Accrual` Toggle; Defer Live `Inventory` Sync (locked)

1. **Dual-Date Append-Only Double-Entry Core ([`src/ledger/`](../src/ledger/README.md)):** Underneath `@dinkuskit/books`, [`src/ledger/`](../src/ledger/README.md) is a small, platform-neutral, append-only double-entry module that enforces `sum(debits) === sum(credits)` in integer minor units on every write (using linked reversing entries rather than destructive edits). Every economic event records both `transaction_date` (when the sale, bill, or charge occurred) and `settled_date` (when cash cleared checking or processor settlement), enabling a 1-click **`Cash | Accrual` toggle** on Profit & Loss and Balance Sheet reports from a single immutable journal.
2. **V1 Inventory Simplicity:** Supplier inventory purchases are categorized cleanly as standard purchase/COGS accounts in V1 (with optional manual CPA year-end inventory count adjustments). Live SKU movement and cost-layer wiring with `@dinkuskit/inventory` is **explicitly deferred** beyond V1 to keep the core ledger standalone and lean.

---

## `d4-continuous-tax-engine` — Safe-to-Spend Header, Processor-Independent County Workbooks & CPA-First Handoff (locked)

Checkout tax-rate calculation remains outside `@dinkuskit/books` (owned by checkout / `@dinkuskit/payments`). `@dinkuskit/books` owns everything **post-checkout** so monthly sales taxes and quarterly income taxes never pile up into Q4:

1. **Three-Bucket "Safe to Spend" Cash Header:** Splits settled operating bank balances into three plain-English numbers:
   - **`Sales Tax Owed`** *(pass-through customer tax held in trust—never P&L revenue)*,
   - **`Income Tax Set-Aside`** *(rolling Federal + State income-tax reserve from real profit)*,
   - **`Safe to Spend`** *(actual available operating cash)*.
2. **Processor-Independent County & Local Sales-Tax Engine (`$0` Open Data):**
   - Works identically across **Stripe**, **Authorize.Net**, future `@dinkuskit/payments` gateways, and **imported order CSVs**—never relying on Stripe Tax alone to identify sub-state jurisdictions.
   - Combines **official quarterly Streamlined Sales Tax (`SST`) public boundary & rate CSVs** (24 SST states with statutory `ZIP+4` / address-range lookup), the **free U.S. Census Bureau Batch Geocoder / TIGER county-place FIPS datasets** (note: Census TIGER returns **address-range interpolated** coordinates rather than parcel/rooftop-exact points, serving as a county/place baseline rather than authoritative polygon proof near boundaries), and **community-contributed open State DOR address/GIS district packs** plus an **optional parcel/rooftop geocoder API plug-in** in non-SST special-district states (such as CA, CO, and TX). Any special-district assignment resolved only via interpolated TIGER coordinates near a district polygon boundary (or an unmatched street range) is **marked `unverified` and routed for authoritative address resolution or human/CPA exception review** before inclusion in a verified return schedule.
   - Generates **state-specific County / Local District Return Schedules** (`.xlsx` / `.csv` + state bulk-upload formats where supported) and reconciles outbound state tax ACH debits (including timely-filing vendor discounts).
3. **Year-Round Quarterly Income-Tax Pacer:** Tracks rolling set-asides against configurable CPA target `%` or prior-year Safe-Harbor baselines across the four statutory deadlines (`Apr 15`, `Jun 15`, `Sep 15`, `Jan 15`), strictly separating prior-year tax balance payments from current-year quarterly credits.
4. **CPA-First Output Default:** Monthly County Sales-Tax Workbooks and year-end `cpa-pack` exports are formatted first for clean **owner review -> CPA email/handoff** (keeping the CPA as the filing shield with state DORs and the IRS), while remaining directly usable by solo operators who self-file. Automated 50-state economic-nexus threshold alarms, wholesale resale-certificate vaults, and external commercial tax-filer connectors are **deferred** beyond V1.

---

## `d5-payroll-and-1099-boundary` — Built-In Gusto Payroll Bridge + Free Native `1099` Tracking (locked)

1. **Hard Reject Native `W-2` Payroll Calculation & Tax Impounding:** `@dinkuskit/books` will never calculate multi-local paycheck withholdings, hold custodial FBO tax float, or originate `W-2` tax filings (`IRC § 6672` personal trust-fund liability and ~5,000 local tax jurisdictions).
2. **Built-In Gusto Payroll Tab:** `@dinkuskit/books` integrates directly with **Gusto** via customer-facing **`gusto-mcp` (`mcp.api.gusto.com` OAuth 2.0) / `gusto-cli`** and zero-gate **Gusto General Ledger CSV** drops—surfacing upcoming payroll cash impact alongside **Safe to Spend** cash, separating officer vs. staff wages, and reconciling `GUSTO NET` and `GUSTO TAX` bank debits to **`$0.00`**.
3. **Free Native `1099-NEC` / `1099-MISC` Contractor Tracking:** Tracks vendor `W-9` status and **category-dependent corporate-exemption overrides** (preserving reportable corporate payments such as `1099-MISC` Box 6 medical/health care payments, `1099-NEC` Box 1 legal fees and `1099-MISC` Box 10 gross proceeds paid to attorneys, Box 8 substitute payments, and Box 11 cash fish purchases), automatically excludes card/processor (`1099-K`) rails (`IRC § 6050W`), enforces **form-, box-, and tax-year-specific thresholds** (`$2,000` federal `TY2026` under `IRC §§ 6041/6041A`—inflation-indexed thereafter, vs. `$600` for `TY2025`—while preserving lower federal statutory thresholds including **`$10`** for `1099-MISC` Box 2 royalties and Box 8 substitute payments under `IRC §§ 6050N / 6045(d)`, **`$600`** for `1099-MISC` Box 10 gross proceeds paid to an attorney under `IRC § 6045(f)` and other non-`§§ 6041/6041A` boxes, **`$0.01+`** whenever federal backup withholding applies in Box 4 under `IRC § 3406`, and **`$600` / state-specific** non-conforming state thresholds), and exports **free IRS IRIS bulk-upload CSVs**—saving contractor-only businesses from paying monthly payroll-tier fees.

---

## `d6-human-agent-co-op-gates` — Human + Agent + CPA Side-by-Side Co-Op (locked)

EmDash Admin UI (Block Kit), `emdash books` CLI, and MCP (`books.*`, read-only by default) operate over **one shared typed domain service**:

- **Agent-Safe Autonomous Staging:** Agents may ingest feeds/settlement batches, match deterministic payouts and transfers, attach/OCR receipts, resolve order addresses to counties, and assemble draft monthly County Sales-Tax Workbooks and year-end `cpa-pack` bundles.
- **Mandatory Human Gates:** Explicit human confirmation is required for **first-time vendor categorization rules, owner-draw / `$2,500` De Minimis Safe Harbor elections, statement reconciliation locks, accounting period closes, and final handoff/submission to a CPA or external agency**. Agents never autonomously submit returns or communicate directly with the IRS or state revenue departments.
