# Benchmark Research: Finaloop, A2X & Synder (Ecommerce Accounting & Payout Reconciliation)

**Check Date:** `2026-10-25`  
**Primary Sources:** [Finaloop How It Works](https://help.finaloop.com/en/articles/6529044-how-does-finaloop-work), [Finaloop Pricing](https://www.finaloop.com/pricing), [Finaloop COGS Methods](https://help.finaloop.com/en/articles/9543974-how-to-choose-your-cogs-tracking-method-in-finaloop), [Finaloop Accrual-to-Cash Tax Guide](https://help.finaloop.com/en/articles/12829108-year-end-tax-guide-adjusting-accrual-books-to-cash-basis), [Finaloop Shipping Cost Guide](https://www.finaloop.com/blog/ecommerce-shipping-cost-accounting-in-2025-complete-guide), [A2X + QBO Hub](https://www.a2xaccounting.com/ecommerce-accounting-hub/a2x-quickbooks), [A2X Clearing Accounts](https://support.a2xaccounting.com/en/articles/6041146-a2x-for-shopify-using-clearing-accounts-for-other-payment-gateways), [Synder Payout Reconciliation](https://synder.com/blog/payout-reconciliation/), [Synder Chargebacks](https://synder.com/help/synder-revrec-stripe-chargebacks-processing/), [Stripe Payout Reconciliation Docs](https://docs.stripe.com/reports/payout-reconciliation).

---

## Platform Baseline Comparison

| Platform | Role & Architecture | Direct Stripe Support? | Sync Granularity | Underlying GL | Key Coverage Limit |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Finaloop** | Closed-loop ecommerce GL + AI categorization + human ecommerce bookkeeper review | **Yes** (3-way sync: Sales Channel + Stripe/PayPal + Bank Feed) | Real-time order/channel + payout clearing + bank match (`< 24h` SLA) | Proprietary ecommerce-native GL (replaces QBO/Xero) | Closed SaaS + service bundle (`$245–$850+/mo`); proprietary ledger lock-in; FIFO `InventoryIQ` costs extra |
| **A2X** | Accrual settlement-summary subledger connector | **No standalone direct Stripe** (requires Shopify/Amazon settlement wrapper) | Per-payout summary JE/Invoice (auto-splits month-end straddles) | Requires **QBO**, **Xero**, or Sage | Cannot process standalone Stripe `balance_transactions`; QBO Cash-Basis reports break on A2X journal entries |
| **Synder** | Multi-gateway payment & ecommerce sync connector | **Yes** (native Stripe `balance_transactions` + `payouts` + reserves/disputes) | Dual mode: **Per-Payout Summary** or **Per-Transaction** | Requires **QBO**, **Xero**, or Sage | Per-Transaction mode bloats QBO/Xero at scale and charges per synced event; requires separate GL subscription |

---

## 1. The Payout-to-Ledger Bridge (Solving Ecommerce's #1 Accounting Bug)

### Why Naive Bookkeeping Fails
Bank feeds only see a net ACH deposit (`STRIPE TRANSFER $9,529.67`) 2–7 days after checkout. Coding bank deposits directly to `Sales`:
1. **Understates gross revenue & hides fees** (causing immediate **IRS Form 1099-K Box 1a** gross-receipts mismatch),
2. **Misstates monthly cutoffs** when orders occur Oct 29–31, refunds/disputes hit Nov 1–2, and cash lands Nov 4,
3. **Treats sales tax collected and rolling reserves as P&L revenue/expense** instead of Balance Sheet pass-through liabilities and restricted assets.

### Required Balance Sheet Clearing & Suspense Accounts
Each processor/wallet is modeled as a **virtual Balance Sheet wallet** between checkout and checking:
- `1050 Processor Clearing — Stripe` *(Current Asset)*: Unsettled/available processor balance in transit. Equals Stripe's live Pending + Available balance at any cutoff, clearing to `$0.00` per settled payout batch (`po_xxx`).
- `1065 Disputes in Progress / Chargeback Suspense` *(Current Asset)*: Holds contested principal pulled by Stripe while card networks adjudicate.
- `1070 Processor Reserve Held — Stripe` *(Current / Restricted Cash Asset)*: Rolling or fixed risk reserves withheld from payouts.
- `1320 Prepaid Postage / Carrier Wallet` *(Current Asset)*: Unspent postage meter balance (e.g., Pitney Bowes / ShipStation wallet) funded from Checking/Card, drawn down only as `Ship` prints labels.
- `2100 Sales Tax Payable` *(Current Liability)*: Pass-through tax collected at checkout, cleared when remitted to states—never touches P&L.

### Penny-Exact Worked Double-Entry Walkthrough (Cross-Month Straddle)
**Scenario (`po_nov04`):**
- **Month A (Oct 29–31) Orders:** `$10,000.00` Gross Product Sales, `-$500.00` Discounts, `+$600.00` Customer Shipping Income, `+$808.00` Sales Tax Collected (`$10,908.00` gross card volume), `-$346.33` Stripe Fees -> **Net Oct Clearing = `+$10,561.67`**. Separately, `Ship` reloads `$1,000.00` into Pitney Bowes wallet and prints `$420.00` of labels.
- **Month B (Nov 1–2) Events inside same payout `po_nov04`:**
  1. Customer refund on Oct order: `$200.00` product + `$17.00` tax = `-$217.00` (Stripe retains original fee).
  2. Chargeback opened on `$300.00` Oct charge (`$275.00` product + `$25.00` tax): Stripe pulls `$300.00` principal + `$15.00` non-refundable Dispute Received Fee (`-$315.00`).
  3. Stripe holds `-$500.00` rolling reserve.
- **Nov 4 Bank Feed Deposit (`po_nov04`):** `$10,561.67 - $217.00 - $315.00 - $500.00 = $9,529.67`.

#### Step A — Month A (Oct 29–31) Order & Postage Entries
| Date | Account | Debit | Credit | Notes |
| :--- | :--- | ---: | ---: | :--- |
| Oct 31 | `1050 Processor Clearing — Stripe` | `$10,561.67` | | Net cash-in-transit owed by Stripe at Oct close |
| Oct 31 | `4100 Discounts (Contra-Revenue)` | `$500.00` | | Preserves gross-to-net bridge on P&L |
| Oct 31 | `6120 Merchant Processing Fees` | `$346.33` | | Stripe `charge` fees |
| Oct 31 | `4000 Gross Product Sales` | | `$10,000.00` | Gross item price before discounts |
| Oct 31 | `4050 Shipping Income` | | `$600.00` | **Never net** against outbound label cost |
| Oct 31 | `2100 Sales Tax Payable` | | `$808.00` | Pass-through liability |
| Oct 29 | `1320 Prepaid Postage Wallet` | `$1,000.00` | | Wallet reload from Checking (**asset transfer, not expense**) |
| Oct 29 | `1000 Operating Checking` | | `$1,000.00` | Matches bank feed ACH out to Pitney Bowes |
| Oct 30 | `5210 Outbound Postage (Fulfillment COGS)` | `$420.00` | | Actual `Ship` labels printed (`$580.00` remains in `1320`) |
| Oct 30 | `1320 Prepaid Postage Wallet` | | `$420.00` | *(If carrier deducts from payout, CR `1050` instead)* |

#### Step B — Month B (Nov 1–2) Pre-Payout Adjustments & Nov 4 Bank Deposit
| Date | Account | Debit | Credit | Notes |
| :--- | :--- | ---: | ---: | :--- |
| Nov 01 | `4200 Refunds & Returns (Contra-Rev)` | `$200.00` | | Reverses product revenue in period of refund |
| Nov 01 | `2100 Sales Tax Payable` | `$17.00` | | Reduces state sales tax liability |
| Nov 01 | `1050 Processor Clearing — Stripe` | | `$217.00` | Deducted from `po_nov04` |
| Nov 02 | `1065 Disputes in Progress (Suspense)` | `$300.00` | | Held off P&L until won/lost |
| Nov 02 | `6125 Chargeback & Dispute Fees` | `$15.00` | | Non-refundable Stripe Dispute Received Fee |
| Nov 02 | `1050 Processor Clearing — Stripe` | | `$315.00` | Deducted from `po_nov04` |
| Nov 02 | `1070 Processor Reserve Held` | `$500.00` | | Restricted cash asset (still owned by merchant) |
| Nov 02 | `1050 Processor Clearing — Stripe` | | `$500.00` | Withheld from `po_nov04` |
| **Nov 04** | **`1000 Operating Checking`** | **`$9,529.67`** | | **1:1 penny match to bank feed `STRIPE TRANSFER`** |
| **Nov 04** | **`1050 Processor Clearing — Stripe`** | | **`$9,529.67`** | **`1050` clears to `$0.00`** |

### Reconciling to the Penny on BOTH Cash and Accrual Bases
- **Why QBO + A2X Breaks on Cash Basis:** QBO cannot distinguish Cash vs. Accrual on A2X Journal Entries and treats deposits into Bank/Asset Clearing accounts as "paid" immediately—so toggling QBO to "Cash Basis" still reports Oct 31 accrual entries in October.
- **Two Distinct "Cash Basis" Modes `dinkuskit/books` Can Support Deterministically:**
  1. **Constructive-Receipt Cash Basis (IRS Card Standard / `1099-K` Aligned):** Card charges captured into a merchant processor balance on Dec 31 are constructively received in Year 1 (matching `Form 1099-K` Box 1a), while unpaid vendor bills (AP) and open B2B invoices (AR) wait for cash settlement.
  2. **Bank-Settlement Cash Basis (Checking Deposit Date):** Defers open `1050 Processor Clearing` batches until `payout_settled_at` hits `1000 Operating Checking` (`Nov 4`). Linking every `balance_transaction` to both `occurred_at` and `payout_id -> bank_settled_at` projects either basis to the exact cent without mutating the journal.

---

## 2. Inventory & COGS Boundary (`dinkuskit/books` <-> `dinkuskit/inventory`)

### Three COGS Modes
1. **Purchase-Based COGS:** Expenses supplier inventory bills when bought/paid; zero monthly Balance Sheet inventory tracking (for micro-brands/dropshippers or `IRC § 471(c)` elections with CPA conformity).
2. **Sales-Based COGS:** Multiplies fulfilled units from `dinkuskit/inventory` by merchant/landed unit cost (`DR 5000 Product COGS / CR 1300 Inventory Asset`).
3. **Unit-Based FIFO COGS (Defer to Post-V1):** Full PO, landed freight/duty allocation, and FIFO cost-layer engine.

### Preventing the Two Classic Double-Deduction Bugs
1. **Ongoing Supplier-Outflow Guardrail:** When Inventory-Asset mode is ON, bank/card outflows to inventory vendors post to `1310 Inventory Purchases Clearing` (`DR 1310 / CR 1000 Checking`), clearing against `dinkuskit/inventory` stock receipts (`DR 1300 Inventory Asset / CR 1310`). Only `stock.fulfilled` / `stock.adjusted` events debit `5000 Product COGS`.
2. **Cash-to-Accrual Cutover Guardrail (`already_expensed` Basis Flag):** Switching from purchase-expensing to SKU COGS forces an explicit cutover wizard: either capitalize opening stock (`IRC § 481(a)` / `Form 3115` schedule) OR tag pre-cutover units `tax_already_expensed = true` so Tax-Basis P&L never double-deducts previously expensed stock.

---

## 3. Human + AI Exception Loop ("Real-Time Books" `< 24h` UX)

- **Silent Deterministic Auto-Post (`~90–95%`):** All `Commerce` orders/refunds/taxes/discounts, `Payments` fees/reserves/payouts, `Ship` wallet reloads & label draws, known recurring SaaS/ad/carrier rules, and matched CC/bank transfers.
- **Plain-English Founder Exception Queue (`Waiting for Input` — Shared by Admin UI & CLI/MCP):**
  1. **Unknown / Multi-Purpose Vendor (`Amazon`, etc.):** `[Packaging/Supplies]` `[Office/Software]` `[Inventory -> 1310]` `[Personal -> Owner Draw 3200]` `[Split]`.
  2. **IRS De Minimis Safe Harbor Gate (`> $2,500`):** Requests invoice attachment so agent/human can check per-item cost `<= $2,500` (instant write-off under `Treas. Reg. § 1.263(a)-1(f)`) vs. `> $2,500` (`1500 Fixed Assets` + `Form 4562` additions schedule).
  3. **Supplier Payment Guardrail:** Confirms Inventory PO deposit (`1310`) vs. R&D samples vs. tooling/mold asset.
  4. **Financing / Capital Advance (`Stripe Capital`):** Records principal (`2400 Loan Payable`) and splits future payout holdbacks into principal vs. financing fee (`6300`).
  5. **Postage / Wallet Reload Confirmation:** Matches Checking outflow to `1320 Prepaid Postage Wallet`.
  6. **Prepaid Annual Contract (`>= 12 mos` materiality threshold):** Offers 12-month amortization schedule (`1350 Prepaid Expenses`) on Accrual while keeping full deduction on Cash Basis.

---

## 4. Pricing & Market Wedge (`2026-10-25`)

| Stack / Option | Monthly Software / Service Cost | Effective Total Monthly Cost (`$500K–$3M/yr` Brand) |
| :--- | :--- | :--- |
| **Finaloop** | Starter `$245/mo`; Core `~$245–$495/mo`; InventoryIQ `+$200–$350/mo` | **`$245 – $845+/mo`** (closed proprietary GL) |
| **A2X + QBO / Xero** | A2X `$29–$179+/mo` + QBO (`$38–$140/mo`) or Xero (`$27–$97/mo`) + Stripe app | **`$165 – $320+/mo` software** (`$500–$1,300+/mo` w/ bookkeeper) |
| **Synder + QBO / Xero** | Synder `$52–$240+/mo` + QBO/Xero | **`$145 – $380+/mo` software** (per-sync volume caps) |

**The Wedge for `dinkuskit/books`:** Because DinkusKit already owns native `commerce`, `payments`, `ship`, and `inventory` events on EmDash, `dinkuskit/books` achieves **zero-connector 3-way reconciliation natively for `$0` SaaS glue tax**, while keeping the ledger open, exportable (`cpa-pack`), and co-operated by humans (Admin UI) and agents (CLI/MCP).
