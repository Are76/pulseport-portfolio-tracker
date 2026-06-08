# Transaction Coverage and Portfolio Insights Audit Plan

> For agentic workers: keep this slice bounded. Audit first, fix second, and avoid turning this branch into a full architecture rewrite.

## Goal

Determine why transaction coverage appears incomplete and reshape `Portfolio Insights` toward a contract-address-backed, transaction-grounded surface instead of a dashboard duplicate.

## Architecture posture

Use the current repository as-is, but evaluate it against the CoinPulse truth model:

`upstream fetches -> transform/merge -> app state -> filtered views -> product surfaces`

This branch is allowed to improve correctness and presentation boundaries, but it must not pretend to complete the full CoinPulse backend migration.

## Relevant references

- `README.md`
- `docs/data-source-audit.md`
- `docs/superpowers/specs/2026-06-03-transaction-coverage-and-portfolio-insights-audit.md`
- `CoinPulse/docs/data-fetching-architecture.md`
- `CoinPulse/docs/pnl-accounting-guardrails.md`
- `CoinPulse/AGENTS.md`

## Task 1: Map the transaction acquisition path

**Files to inspect**
- `src/App.tsx`
- `src/lib/api/portfolio-client.ts`
- `src/server/portfolio/portfolio-service.ts`
- any explorer / scan helpers referenced by transaction fetch paths

- [ ] Identify every source feeding PulseChain / Ethereum / Base transactions
- [ ] Record page size, cursoring, block range, and time-window behavior
- [ ] Identify any local caps, truncation, or per-source limits
- [ ] Write findings into the audit notes in this plan or a companion docs file

## Task 2: Map the transaction transform and merge path

**Files to inspect**
- `src/App.tsx`
- `src/components/TransactionList.tsx`
- `src/pages/TransactionsPage.tsx`
- any transaction normalization helpers

- [ ] Trace how raw source events become UI transactions
- [ ] Identify dedupe logic and verify whether it can drop valid events
- [ ] Identify symbol-based or loose identity paths that can conflate assets
- [ ] Verify whether UI filters or selected wallet scope hide valid events after fetch

## Task 3: Determine why `Portfolio Insights` is misleading

**Files to inspect**
- `src/App.tsx`
- `src/components/atlas/AtlasHomeSurface.tsx`
- `src/components/atlas/atlas-portfolio-snapshot.ts`
- any route / tab logic used for the overview surface

- [ ] Document what data currently powers `Portfolio Insights`
- [ ] Identify which dashboard-derived elements are incorrectly reused
- [ ] Define the minimum CA-/coin-based fact model it should show instead
- [ ] Decide whether this branch should do a small correction or only set up the next slice

## Task 4: Implement the smallest safe fixes

Only if root cause is clear and bounded.

Candidate bounded fixes:

- [ ] remove or relax accidental transaction truncation
- [ ] correct a broken merge/dedupe rule
- [ ] fix wallet/filter scope that hides valid history
- [ ] relabel or reroute `Portfolio Insights` so it stops pretending to be a richer surface than it is
- [ ] add explicit empty/partial/freshness messaging if the data is incomplete

Do **not**:

- [ ] add new third-party data sources
- [ ] refactor the whole app into a backend DTO-only architecture here
- [ ] build the prototype calculators in this branch

## Task 5: Add focused tests

- [ ] add/adjust transaction coverage tests for the identified failure mode
- [ ] add/adjust routing or rendering tests for `Portfolio Insights`
- [ ] keep tests focused on the specific bug and product correction

## Task 6: Verify sequentially

- [ ] `npm run test`
- [ ] `npm run lint`
- [ ] `npm run build`

If the full test suite still has unrelated known failures, call them out explicitly and separate them from this slice.

## Exit criteria

This branch is ready when:

- we can explain the current transaction-count gap in plain language,
- any bounded fix included here is verified,
- `Portfolio Insights` no longer reads like an accidental dashboard duplicate without explanation,
- and the next slice can confidently target either deeper insights correction or prototype calculators.
