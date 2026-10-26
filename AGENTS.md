# Agent Contract

This public repository owns DinkusKit Books (`@dinkuskit/books`), the
open-source bookkeeping, multi-processor reconciliation, and continuous
tax-readiness ledger for EmDash sites, plus its decoupled open-source US County
& State Sales-Tax Schedule engine. Assume every committed byte is immediately
public.

## Source priority

1. This file.
2. [`docs/CHARTER.md`](docs/CHARTER.md).
3. [`.grilltrack/ledger.json`](.grilltrack/ledger.json), maintained only through
   the GrillTrack CLI.
4. Current source, tests, and committed proof.

Read the public [DinkusKit vision](https://github.com/dinkuskit/.github/blob/36aab690a7ef66dc119aab70e258ea979c54841a/VISION.md)
and [scope and planning](https://github.com/dinkuskit/.github/blob/36aab690a7ef66dc119aab70e258ea979c54841a/ROADMAP.md)
as product context. They do not replace this repository's six locked decisions
or make accepted designs active implementation work. For a material product,
architecture, or verification question, use the canonical
[selective research guidance](https://github.com/saariuslystoned/SaariusSkills/blob/23f2bb1208b3baa7aedaa87faec00395f9bdd061/skills/emdash-commerce/SKILL.md).
Routine fixes do not require a new research cycle; a substantive conflict with
a locked decision must return to its owning decision record.

## Public-safe boundary

- Never commit credentials, environment files, customer or tenant data,
  business addresses or figures, bank/card identifiers, tax returns, spreadsheet
  URLs, production configuration, private repository coordinates, or private
  operating rationale.
- This repository has an independent Git root. Never merge, cherry-pick,
  subtree, fork, bundle, or otherwise import unrelated repository history.

## Product boundary

- `@dinkuskit/books` works **standalone on any EmDash CMS site** with zero hard
  dependency on `@dinkuskit/commerce`.
- When installed alongside DinkusKit companion plugins, `dinkuskit/commerce`
  owns catalog, cart, checkout orchestration, and orders; `dinkuskit/payments`
  owns processor connections (`Stripe`, `Authorize.Net`, and future providers)
  and checkout tax/payment capture; `dinkuskit/ship` owns postage labels and
  tracking; `dinkuskit/inventory` owns physical stock truth (live SKU COGS sync
  deferred beyond V1).
- `@dinkuskit/books` owns post-checkout bookkeeping, bank/card/batch
  reconciliation, Cash/Accrual financial statements, processor-independent
  county sales-tax workbooks, quarterly estimated income-tax reserve tracking,
  native `1099` contractor tracking, and Gusto payroll ledger clearing.
- Non-technical humans (in EmDash Admin) and AI agents (via CLI and read-default
  MCP) share one typed service. First-time vendor rules, owner/tax elections,
  statement reconciliation locks, period closes, and external CPA/tax handoffs
  are strictly human-gated.
- A supplied first-party assistant is optional. Merchant-selected assistants
  use the same supported interfaces and explicit permissions; first-party
  assistants receive no hidden authority. Access starts read-only.
- One accountable operator may direct staff, contractors, and several sites.
  Business-wide and site-specific knowledge require explicit permissions and
  authorized overrides; private conversations do not automatically become
  shared records. Cross-site consolidation and shared knowledge storage are
  not added to this charter by that direction.

## Architecture layout

- **Outer product (`@dinkuskit/books`) vs. inner double-entry core
  ([`src/ledger/`](src/ledger/README.md)):** `@dinkuskit/books` owns the
  merchant- and CPA-facing bookkeeping, reconciliation, and tax-readiness
  workflows; [`src/ledger/`](src/ledger/README.md) is the small, append-only
  minor-unit double-entry database module underneath that enforces
  `sum(debits) === sum(credits)` on every write and records reversals instead of
  mutating posted rows.
- **Adapter-free kernel boundary:** `src/ledger/` must stay platform- and
  adapter-neutral—never importing EmDash Admin UI, HTTP routes, CLI/MCP
  transports, county sales-tax schedule packs, or companion plugins. Every
  balance-affecting write in `@dinkuskit/books` flows through
  `src/ledger/index.ts`.

## State and gates

- Charter locked (`0.0.0`, `private: true`). Add implementation only after its
  slice is grilled and locked through GrillTrack, on an isolated branch and
  worktree with tests and proof.
- Do not publish to npm, list in an EmDash marketplace or registry, create
  external accounts, deploy, merge, or mutate a production site without
  explicit owner approval.
