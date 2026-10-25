# books

`* * *`

Open-source bookkeeping, multi-processor reconciliation, and continuous tax
readiness for **any [EmDash](https://github.com/emdash-cms/emdash) site**—usable
standalone by agencies, creators, and service businesses, with automatic
adapters when [DinkusKit](https://github.com/dinkuskit) Commerce, Payments, or
Ship are installed. Planned package: `@dinkuskit/books`.

Built for **humans, agents, and CPAs** to work side by side: owners operate in
EmDash Admin while agents stage bank/batch matches, resolve county sales-tax
schedules, and assemble CPA-ready monthly and year-end packs via CLI and MCP
under strict human approval gates.

## Locked V1 Charter (`2026-10-25`)

See [`docs/CHARTER.md`](docs/CHARTER.md) and the
[`docs/research/`](docs/research/README.md) benchmark synthesis:

- **Standalone on any EmDash site** (local SQLite or hosted) + 1-click
  `cpa-pack` ZIP export + decoupled open-source **US County & State Sales-Tax
  Schedule** library usable even outside EmDash;
- **Bank, card & multi-processor reconciliation:** free `CSV/OFX/QFX` imports,
  optional `$15/yr` user-direct `SimpleFIN` feeds, and clearing support for both
  net-fee payouts (`Stripe`) and gross batch settlements (`Authorize.Net` +
  high-risk/future `@dinkuskit/payments` gateways);
- **1-click `Cash | Accrual` toggle** on Profit & Loss and Balance Sheet from a
  single immutable minor-unit ledger;
- **Year-round tax calm (CPA-first):** 3-bucket **`Safe to Spend`** cash header,
  processor-independent **County Sales-Tax Workbooks** (`SST` + `US Census` +
  open state DOR GIS data), and rolling quarterly Federal + State income-tax
  pacing;
- **Built-in Gusto payroll bridge + free native `1099` tracking** (`gusto-mcp` /
  `gusto-cli` / CSV clearing to `$0.00` + free IRS IRIS `1099` CSVs; no native
  `W-2` withholding liability).

## Architecture

- **Outer product (`@dinkuskit/books`):** EmDash Admin UI (`Safe to Spend`
  header, Bank & Multi-Processor Reconciliation, Gusto tab, County Sales-Tax
  Workbooks, `Cash | Accrual` reports, `cpa-pack`), `emdash books` CLI,
  read-default `books.*` MCP tools, and optional Commerce/Payments/Ship
  adapters.
- **Inner double-entry engine ([`src/ledger/`](src/ledger/README.md)):** Small,
  platform-neutral, append-only integer minor-unit accounting core underneath
  `@dinkuskit/books` that enforces `Debits == Credits` on every write and uses
  reversing entries instead of destructive row edits.
- **Decoupled US County & State Sales-Tax Schedule library:** Framework-agnostic
  open-source jurisdiction resolver and state return-schedule builder usable
  standalone inside or outside EmDash.

## Status

Charter locked (`0.0.0`, `private: true`). Runtime implementation proceeds
slice-by-slice through GrillTrack on isolated worktrees with tests and proof.

Under construction, dogfooding in the open. MIT.
