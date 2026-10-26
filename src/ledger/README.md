# `src/ledger/` — Double-Entry Accounting Core

`src/ledger/` is the small, platform-neutral, append-only double-entry engine
underneath `@dinkuskit/books`.

## Two-Layer Boundary

- **Outer product (`@dinkuskit/books`):** Owns the EmDash Admin UI (`Safe to
  Spend` cash header, Bank & Multi-Processor Reconciliation, Gusto Payroll tab,
  County Sales-Tax Workbooks, `Cash | Accrual` Profit & Loss and Balance Sheet,
  and 1-click `cpa-pack` exports), the `emdash books` CLI, the read-default
  `books.*` MCP surface, and optional companion adapters (`@dinkuskit/commerce`,
  `@dinkuskit/payments`, `@dinkuskit/ship`).
- **Inner engine (`src/ledger/`):** Owns the canonical chart of accounts,
  append-only journal entries, integer minor-unit posting lines, dual-date basis
  projection (`transaction_date` + `settled_date`), and deterministic balance /
  tie-out invariants.

All balance-affecting state in `@dinkuskit/books` flows through `src/ledger/`.
Outer workflows never insert, update, or delete ledger rows directly.

## Hard Invariants (Enforced on Every Write)

1. **Zero-Sum Double-Entry (`Debits == Credits`):**
   - Every journal entry contains two or more integer minor-unit lines (never
     IEEE-754 floating-point numbers).
   - Every write enforces `sum(debits) === sum(credits)` per currency inside a
     single atomic database transaction. Unbalanced postings are hard-rejected.
2. **Append-Only Immutability:**
   - Posted journal entries and posting lines are never updated or deleted in
     place.
   - Voids, reclassifications, and statement `Remove & Redo` actions append
     explicit reversing entries linked to the original entry ID, preserving a
     complete CPA audit trail.
3. **Dual-Date `Cash | Accrual` Projection:**
   - Entries record `transaction_date` (when the economic event occurred,
     powering **Accrual** reports) and `settled_date` (when cash cleared
     checking or processor settlement, powering **Cash** reports) so both bases
     project deterministically from one ledger.
4. **Adapter-Free Kernel Isolation:**
   - Modules inside `src/ledger/` must not import EmDash UI components, HTTP
     route handlers, CLI/MCP transports, county sales-tax schedule packs, or
     companion plugins (`@dinkuskit/commerce`, `@dinkuskit/payments`,
     `@dinkuskit/ship`, `@dinkuskit/inventory`).
   - Outer features consume `src/ledger/` strictly through its public entrypoint
     (`src/ledger/index.ts`).
5. **Closed-Form Verification for Tests & Supervised Agents:**
   - Because ledger state obeys exact conservation laws (`sum(debits) ===
     sum(credits)`, `trial_balance_delta === 0`, and statement reconciliation
     `statement_ending_balance - reconciled_ledger_balance === 0`), automated
     tests and supervised agents verify every staged batch or match
     mathematically before human sign-off.

## Status

Charter & scaffold boundary locked (`0.0.0`). Runtime TypeScript modules land in
`src/ledger/` when GrillTrack Cycle 2A (`Core Double-Entry Ledger, Chart of
Accounts & Bank/Multi-Processor Reconciliation Kernel`) is grilled and locked.
