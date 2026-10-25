# DinkusKit Books — Competitive Research Synthesis

**Check Date:** `2026-10-25`  
**Scope:** Deep competitive benchmark across 7 industry-leading platforms and adjacent protocols to ground **GrillTrack Cycle 1 (Charter & Scope)** for `@dinkuskit/books`.

---

## Research Brief Index

1. [01-xero.md](01-xero.md) — **Xero:** Dual-balance statement reconciliation, Cash/Accrual projection, `Find & Match`, Gusto sync, and Xero's fatal API/MCP wall on bank statement lines.
2. [02-quickbooks-online.md](02-quickbooks-online.md) — **QuickBooks Online (QBO):** The US CPA handoff contract (`cpa-pack`), `Blank -> C -> R` monthly statement reconciliation, `1099-K` gross-to-net bridge, and Intuit `CorePlus` read-API metering.
3. [03-taxjar-stripe-tax.md](03-taxjar-stripe-tax.md) — **TaxJar & Stripe Tax:** Checkout rate calculation vs. post-checkout sales-tax subledger, `BalanceTransaction` fee-on-tax asymmetry, 2025–2026 nexus repeal wave, and state-scoped resale certificates.
4. [04-numeral.md](04-numeral.md) — **Numeral (vs. TaxCloud & Anrok):** D2C pass-through sales-tax cash sweeps, `Tax Delta` + timely-filing discounts, state DOR ACH Originator matching, 1st–10th close checklist, and read-default MCP design.
5. [05-gusto-payroll-1099.md](05-gusto-payroll-1099.md) — **Gusto & `1099` Contractors:** Why native `W-2` payroll is a hard reject (`IRC § 6672` liability), Gusto's official `gusto-cli` / `gusto-mcp` + GL clearing accounts, and native `1099-NEC`/`1099-MISC` (`$2,000` OBBBA threshold + free IRS IRIS CSV).
6. [06-finaloop-a2x.md](06-finaloop-a2x.md) — **Finaloop, A2X & Synder:** Penny-exact cross-month payout clearing (`1050`), dispute suspense (`1065`), reserves (`1070`), postage wallets (`1320`), `inventory` COGS double-deduction guardrails, and plain-English founder exception prompts.
7. [07-found-relay-puzzle.md](07-found-relay-puzzle.md) — **Found, Relay, Puzzle.io & SimpleFIN:** Three-bucket cash visibility (`Sales Tax Trust` + `Fed/State Income Tax Reserve` + `Spendable Cash`), Safe Harbor vs. Annualized tax reserve math (fixing Found's S-Corp blind spot), dual-basis streaming ledgers, and `$15/yr` SimpleFIN + OFX/CSV bank feeds.

---

## Cross-Platform Comparison Matrix

| Platform (2026 Pricing) | Core Strength | Ecommerce / Agent Failure Mode | Verdict for `@dinkuskit/books` |
| :--- | :--- | :--- | :--- |
| **Xero** (`$27–$97/mo`) | Clean dual-balance (`Statement` vs. `Ledger`) reconciliation, `Find & Match`, dynamic Cash/Accrual projection | Public API & MCP **prohibit reading raw bank feed lines or reconciling via API**; `/Journals` read costs `~$895/mo` partner tier; raw net payouts misstate revenue & sales tax | **ADOPT** dual-balance tie-outs, `Find & Match`, clearing invariants & dynamic Cash/Accrual; **REJECT** multi-currency/CIS/practice-manager bloat |
| **QuickBooks Online** (`$38–$340/mo`) | Default US CPA year-end handoff (`Trial Balance`, `GL`, `12/31` Recon Certs, period lock) | Solopreneur (`$20`) has `1040-ES` estimates but no Balance Sheet; QBO Plus (`$140`) drops `1040-ES` completely; Cash-Basis breaks on A2X journal entries; read API metered (`CorePlus`) | **ADOPT** 1-click **`cpa-pack` ZIP**, strict `$0.00`-diff `Blank -> C -> R` statement certs, and immutable period-close locks; **REJECT** `Opening Balance Equity` auto-plugs |
| **TaxJar + Stripe Tax** (`0.5%`/txn + `$39–$99/mo` + `$50–$55/return`) | Stripe Tax excels at checkout rooftop rate calc; TaxJar tracks post-checkout state liability | `BalanceTransaction` lacks `amount_tax` and charges `2.9%` fee on tax; Stripe Monitoring ignores marketplace/wholesale splits; neither stores resale PDFs; `$5k+/yr` AutoFile cliff | **KEEP** checkout calculation in `Payments`/Stripe Tax; **ADOPT** post-checkout `2100.US-<STATE>` subledger, state-scoped resale cert vault, and state-timezone return worksheets |
| **Numeral / TaxCloud** (`$0/mo + $75/return` vs. SST `$0` filing) | Numeral's 1st–10th close cadence, `Tax Delta` (`<= 5%`), timely-filing discounts, DOR ACH ID matching, read-default MCP | Overkill cost (`$900–$1,500+/yr`) for 1–4 state stores that only need clean county/state numbers; holds no escrow (relies on merchant bank sub-account) | **ADOPT** 1st–10th Monthly Tax Close checklist, DOR ACH ID matcher, timely-filing discount split, and zero-migration Numeral/TaxCloud export seams |
| **Gusto** (`$49/mo + $6/person`; `$0` Xero/QBO sync fee) | Handles 5,000 local tax tables, SUTA, garnishments, FBO float, `Form 941/W-2`, plus official `gusto-cli` & `gusto-mcp` | Partner REST/Embedded APIs are gated; `1099`-only plans charge `$35/mo + $6/contractor` for simple vendor threshold tracking | **REJECT** native `W-2` payroll (`IRC § 6672` liability); **ADOPT** native `1099-NEC`/`1099-MISC` (`$2,000` OBBBA + free IRS IRIS CSV) + provider-agnostic `PayrollRunImport` clearing bridge |
| **Finaloop + A2X / Synder** (`$245–$845+/mo` vs. `$165–$380/mo` glue stack) | 3-way payout clearing (`1050`), dispute suspense (`1065`), postage wallet (`1320`), `< 24h` plain-English founder exception queue | Expensive closed proprietary GL (Finaloop) or brittle multi-subscription connector stack (QBO + A2X + Synder) | **ADOPT** native zero-connector event bridge across `commerce`, `payments`, `ship`, and `inventory`, COGS double-deduction guardrails, and 1-click founder/MCP exception cards |
| **Found + Relay + Puzzle + SimpleFIN** (`$0–$80/mo` + `$15/yr` SimpleFIN) | Real-time `Sales Tax Trust` + `Fed/State Income Tax Reserve` + `Spendable Cash` waterfall; Safe Harbor tracking; `$15/yr` open bank feeds | **Found disables tax estimates for S-Corps (`1120-S`)**; commercial Plaid requires vendor proxy & per-account minimums | **ADOPT** Three-Bucket Cash header, user-configured **Schedule C + S-Corp (`1120-S`)** Safe-Harbor & Annualized reserve scenarios, and **SimpleFIN (`$15/yr`) + OFX/QFX/CSV + native Stripe/Mercury APIs** |

---

## Architectural Synthesis: Why `@dinkuskit/books` Wins Without Bloat

1. **Zero-Connector Ecommerce Native:** Unlike Xero/QBO (which only see net bank deposits and need `$150–$300/mo` of A2X/Synder middleware) and Finaloop (`$245–$850/mo` closed SaaS), `@dinkuskit/books` sits alongside `@dinkuskit/commerce`, `@dinkuskit/payments`, `@dinkuskit/ship`, and `@dinkuskit/inventory`—decomposing gross sales, discounts, shipping income, state/county sales tax, Stripe fees, disputes, postage wallets, and SKU COGS natively at `$0` SaaS glue cost.
2. **True Human + Agent Side-by-Side Co-Op:** Xero blocks bank-feed API access and Intuit meters reads. `@dinkuskit/books` exposes the **exact same typed domain service** to non-technical operators in EmDash Admin (Block Kit) and AI agents via CLI (`emdash books ...`) and read-default MCP (`books.*`), with explicit human gates on period locks, tax/equity elections, and external filings.
3. **Year-Round Tax Calm (Sales Tax + Federal/State Income Tax):** Every settled payout strips **100% of pass-through Sales Tax (`2100.US-<STATE>`)** first, then calculates configurable **Quarterly Federal + State Income Tax Reserves** (Safe Harbor `100%/110%` floor + YTD Annualized Net Profit cushion across both Schedule C and S-Corp `1120-S` officer-wage profiles)—eliminating both monthly sales-tax drift and Q4 tax surprises.
