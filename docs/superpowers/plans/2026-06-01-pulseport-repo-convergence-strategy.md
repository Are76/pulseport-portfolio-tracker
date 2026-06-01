# PulsePort Repo Convergence Strategy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `pulseport-portfolio-tracker` the single canonical product repo while importing the best validated frontend ideas from `PulsePort` and the best backend/data patterns from `CoinPulse`.

**Architecture:** Use one-way convergence into `pulseport-portfolio-tracker`. `PulsePort` remains a UI/product donor and `CoinPulse` remains a backend/truth-model donor. Execute work in bounded slices so UI redesign, DTO migration, and data correctness do not get mixed into the same branch unless a slice explicitly requires both.

**Tech Stack:** Vite, React 19, TypeScript, existing `src/server/*` modules, existing Atlas components, existing Vercel-compatible API routes, CoinPulse-derived DTO/service patterns, repo docs under `docs/` and `docs/superpowers/`.

---

## Decision Summary

- `pulseport-portfolio-tracker` is the **canonical repo**.
- `PulsePort` is the **frontend donor repo**.
- `CoinPulse` is the **backend donor repo**.
- No new primary product work should start in `PulsePort`.
- No direct frontend truth logic should be added while converging toward `CoinPulse` backend discipline.

## Why This Is The Lowest-Risk Path

This decision avoids three kinds of wasted work:

1. **Restart waste**
   - Moving the product back into `PulsePort` would require redoing backend migration there.

2. **Merge chaos**
   - Trying to merge repos wholesale would create large, low-confidence conflicts across shell, app flow, and data logic.

3. **Scope drift**
   - Mixing design polish, backend truth migration, and feature expansion in the same branch would slow review and increase regressions.

## Source-Of-Truth Matrix

Use this matrix whenever a future task is planned:

| Concern | Primary source | Notes |
| --- | --- | --- |
| Product repo | `pulseport-portfolio-tracker` | All implementation lands here |
| Shell/page IA | `PulsePort` | Reuse patterns, not wholesale copy |
| DTO/truth model | `CoinPulse` | Backend owns balances, pricing, PnL, coverage, provenance |
| Current Atlas UI | `pulseport-portfolio-tracker` | Continue evolving this product identity |
| Legacy prototype patterns | `PulsePort` and older tracker code | Treat as research unless explicitly adopted |

## Working Rules For Smoother Execution

These rules are adapted from the strongest parts of the `CoinPulse` working style and should govern future tracker work:

1. Keep one branch per bounded task.
2. Do not mix broad UI restyling with backend truth migration unless the UI depends on the DTO change.
3. Preserve backend-owned warnings, status fields, freshness, provenance, and unsupported states.
4. Do not add new frontend accounting, pricing, LP valuation, or PnL logic.
5. Prefer additive migration over sweeping rewrites.
6. Treat donor repos as references, not destinations.
7. Update docs/plans when strategy changes so the next worker does not repeat discovery.

## Execution Tracks

Future work should be sorted into one of these tracks before implementation starts:

### Track A: Atlas UI / UX

Use when the task is about:

- shell polish
- page hierarchy
- cards, drawers, sheets
- typography/spacing/colors
- mobile navigation
- click-through clarity

Rule:

- no backend semantic changes unless strictly needed for rendering

### Track B: DTO / Backend Truth Alignment

Use when the task is about:

- API routes
- `src/server/*`
- pricing status
- materialization coverage
- PnL status
- warnings/provenance/freshness

Rule:

- no broad visual redesign in the same PR

### Track C: Product Surface Migration

Use when a page needs both:

- new UI structure from `PulsePort`
- and backend contract alignment from `CoinPulse`

Examples:

- Wallets page
- Transactions page
- HEX stakes page
- DeFi / LP summary page

Rule:

- keep to one page/surface at a time

## Recommended Page-By-Page Order

Follow this sequence unless a production bug forces reprioritization:

1. Dashboard / home intelligence surface
2. Wallets
3. Token detail / product page
4. Transactions
5. HEX stakes
6. Bridges
7. DeFi / LP

Why this order:

- it starts with the highest-visibility surfaces
- it keeps navigation and mental model stable
- it lets backend truth improvements land first where users notice them most

## Task 1: Align Existing Plans With Canonical Repo Strategy

**Files:**
- Modify: `docs/superpowers/plans/2026-05-28-gopulse-inspired-pulseport-ui-implementation.md`
- Modify: `docs/superpowers/plans/2026-05-31-atlas-mobile-navigation-detail.md`
- Create: `docs/superpowers/plans/2026-06-01-pulseport-repo-convergence-strategy.md`

- [ ] **Step 1: Add strategic update notes to existing Atlas plans**

Add a short section near the top of each plan that states:

- the canonical repo is `pulseport-portfolio-tracker`
- `PulsePort` is the UI donor
- `CoinPulse` is the backend donor
- UI-only branches should stay UI-only unless explicitly promoted to a hybrid slice

- [ ] **Step 2: Save the new convergence plan**

Create this document as the cross-repo working agreement so future branches start from the same decision.

- [ ] **Step 3: Verify plan coherence manually**

Check that:

- the old plans no longer imply `PulsePort` should be revived as the main repo
- the new plan gives a clear branch taxonomy
- the page order matches current product priorities

## Task 2: Turn CoinPulse Working Style Into Tracker Guardrails

**Files:**
- Verify: `CoinPulse/AGENTS.md`
- Verify: `CoinPulse/docs/data-fetching-architecture.md`
- Verify: `pulseport-portfolio-tracker/docs/data-source-audit.md`
- Modify: `docs/superpowers/plans/2026-06-01-pulseport-repo-convergence-strategy.md`

- [ ] **Step 1: Preserve the smallest high-value rules**

Carry over only the rules that reduce extra work:

- one branch per bounded slice
- backend truth stays backend-owned
- explicit unsupported/partial states are correct behavior
- docs should record decisions before implementation drifts

- [ ] **Step 2: Avoid importing CoinPulse process overhead blindly**

Do not copy every CoinPulse rule into tracker planning. Keep only the rules that help a UI-heavy product move faster without losing data integrity.

- [ ] **Step 3: Record the practical result**

Make the convergence plan read like a working agreement for future PRs, not a heavy governance document.

## Task 3: Define The Next Working Rhythm

**Files:**
- Modify: `docs/superpowers/plans/2026-06-01-pulseport-repo-convergence-strategy.md`
- Verify: `docs/superpowers/plans/2026-05-28-gopulse-inspired-pulseport-ui-implementation.md`
- Verify: `docs/superpowers/plans/2026-05-31-atlas-mobile-navigation-detail.md`

- [ ] **Step 1: Record branch categories**

State clearly that future work must be labeled as:

- Atlas UI / UX
- DTO / Backend Truth Alignment
- Product Surface Migration

- [ ] **Step 2: Record the page order**

Add the recommended page-by-page order so future design work continues in a predictable sequence.

- [ ] **Step 3: Record the handoff rule**

State that every completed branch should leave behind:

- what changed
- whether it touched UI, DTOs, or both
- what next bounded task should follow

## Task 4: Verify And Prepare Handoff

**Files:**
- Verify: `docs/superpowers/plans/2026-06-01-pulseport-repo-convergence-strategy.md`
- Verify: `docs/superpowers/plans/2026-05-28-gopulse-inspired-pulseport-ui-implementation.md`
- Verify: `docs/superpowers/plans/2026-05-31-atlas-mobile-navigation-detail.md`

- [ ] **Step 1: Review for contradictions**

Make sure there is no statement that:

- suggests moving implementation back into `PulsePort`
- suggests broad backend work inside UI-only branches
- suggests frontend truth computation is acceptable long term

- [ ] **Step 2: Review for usability**

Make sure a future agent or engineer can answer these questions quickly:

- where should work happen?
- what repo is a donor vs canonical?
- what kind of branch is this?
- what page should be tackled next?

- [ ] **Step 3: Stop after documentation**

Do not mix implementation changes into this planning slice. The output of this slice is decision clarity and smoother future execution.

## Recommended Next Bounded Task

After this planning slice, the next best execution slice is:

- `Wallets` as a **Product Surface Migration** branch

That branch should:

- keep `pulseport-portfolio-tracker` as the execution repo
- borrow `PulsePort` wallet page structure and information architecture where useful
- preserve Atlas visual direction
- align wallet data surfaces more closely with `CoinPulse` backend DTO discipline
