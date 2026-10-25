# Agent Contract

This public repository owns DinkusKit Books, the open-source bookkeeping,
reconciliation, and tax-readiness layer for EmDash commerce sites. Assume every
committed byte is immediately public.

## Source priority

1. This file.
2. `docs/CHARTER.md` (once grilled and locked).
3. `.grilltrack/ledger.json`, maintained only through the GrillTrack CLI.
4. Current source, tests, and committed proof.

## Public-safe boundary

- Never commit credentials, environment files, customer or tenant data,
  business addresses or figures, bank/card identifiers, tax returns, production
  configuration, private repository coordinates, or private operating rationale.
- This repository has an independent Git root. Never merge, cherry-pick,
  subtree, fork, bundle, or otherwise import unrelated repository history.

## Product boundary (bootstrap)

- `dinkuskit/commerce` owns catalog identity, authoritative price, cart,
  checkout orchestration, Commerce receipts, and orders.
- `dinkuskit/payments` owns processor connections and normalized payment
  outcomes; `dinkuskit/ship` owns postage labels and tracking;
  `dinkuskit/inventory` owns physical stock truth.
- `dinkuskit/books` owns post-checkout bookkeeping, bank/card/payout
  reconciliation, financial statements, and continuous sales-tax and estimated
  income-tax readiness, built so non-technical humans (in EmDash Admin) and
  agents (via CLI and MCP) operate side by side on the same typed rules and
  permissions.
- Exact scope, ledger topology, payroll/contractor boundaries, and integration
  contracts remain open until grilled and locked through GrillTrack.

## Bootstrap state and gates

- Public design stub (`0.0.0`, `private: true`). Add implementation only after
  its domain is grilled and locked through GrillTrack, on an isolated branch
  and worktree with tests and proof.
- Do not publish to npm, list in an EmDash marketplace or registry, create
  external accounts, deploy, merge, or mutate a production site without
  explicit owner approval.
