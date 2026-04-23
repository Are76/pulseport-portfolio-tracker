# PulsePort Product Audit (UX/UI, Data Fetching, Code Structure)

Date: 2026-04-23

## 1) Executive summary

PulsePort already has strong visual ambition and deep on-chain integrations, but its current release risk is **consistency + reliability**, not feature scope.

Top priorities before a premium launch:

1. **Stabilize data pipelines** (clear source-of-truth, retries, validation, observability).
2. **Break up the monolithic app file** into domain modules to reduce regression risk.
3. **Unify design system usage** so shell/UI patterns are consistent across all pages.
4. **Expand test coverage beyond shell navigation** to cover blockchain data correctness and user-critical flows.

---

## 2) UX / UI / Style / Fonts audit

## Strengths

- Strong tokenized visual system with clear semantic variables and dark/light themes.
- Typography hierarchy is deliberate (`Exo 2`, `JetBrains Mono`, shell display font) and matches dashboard use-cases.
- Contrast appears intentionally tuned in comments and variable choices.

## Risks and inconsistencies

### A) Two parallel UI systems are present

The repository includes a separate shell system (`src/shell/*`) with dedicated layout/CSS, while `App.tsx` renders a large custom shell-like implementation directly.

- Result: style drift and duplicated navigation/layout logic over time.
- Release risk: visual inconsistency between future pages/components.

### B) Font strategy may increase render variability

Fonts are loaded from both Google Fonts import and local `@font-face`, with additional fallback stacks.

- Result: potential FOUT/FOIT and cross-platform differences in perceived quality.
- Recommendation: define one canonical typography stack per surface (dashboard body, numeric values, display headers) and enforce it component-level.

### C) Visual complexity without a codified component contract

Many premium card/modal patterns exist, but there is no single documented component spec in code that maps states (default/hover/loading/error/empty).

- Result: hard to preserve premium polish while iterating quickly.

---

## 3) Data fetching and blockchain correctness audit

## What is good

- Multiple fallback RPCs are defined for chains.
- Hook-level fetch logic has timeouts and graceful degradation in places.
- On-chain liquidity logic includes reserve + supply + wallet balances and optional subgraph enrichment.

## Key correctness/reliability concerns

### A) Abort controllers are created but not wired into requests in some hooks

In multiple hooks, `AbortController` instances are created, but request `signal` is not passed through to fetch calls.

Impact:
- stale request races,
- unnecessary load,
- possible incorrect UI state after rapid interactions.

### B) Critical external APIs are called directly in `App.tsx`

`App.tsx` performs many direct fetches (CoinGecko, DexScreener, Llama, explorer endpoints, raw RPC).

Impact:
- difficult to reason about failure modes,
- duplicated retry/backoff behavior,
- hard to test deterministically.

### C) RPC/source metadata is split across constants and hooks

Chain/RPC definitions exist centrally, but hooks also hardcode key RPC and endpoint values.

Impact:
- drift risk when endpoints change,
- inconsistent fallback behavior by feature.

### D) Partial webhook endpoint exists without signature verification

`/api/moralis/stream` currently logs and echoes summarized payloads but does not verify webhook authenticity.

Impact:
- not production-safe for trust-sensitive data ingestion.

---

## 4) Code structure audit

### A) `App.tsx` size is a major maintainability risk

`App.tsx` is very large (7k+ lines), combining rendering, data orchestration, external APIs, and business logic.

Impact:
- high coupling,
- harder onboarding,
- high chance of regression from small edits.

### B) Test coverage is too narrow for release confidence

Current tests verify app shell rendering and nav routing only.

Missing high-value tests:
- token/price normalization,
- data-source fallback behavior,
- blockchain decode correctness,
- empty/error/loading state UX.

### C) Duplicate/parallel domain logic

Some data concerns are split between app-level logic and dedicated hooks, creating unclear ownership boundaries.

---

## 5) Launch plan: become the premium first-choice PulseChain tracker

## Phase 0 (1 week): Product definition and acceptance criteria

- Define 10 non-negotiable premium UX outcomes:
  - load-time target,
  - data freshness SLA,
  - no unresolved placeholder states,
  - deterministic handling of stale data.
- Freeze v1 scope (avoid feature sprawl).
- Build a release scorecard (Design, Data Correctness, Reliability, Trust, Performance).

## Phase 1 (1–2 weeks): Data reliability hardening

- Create a `data-client` layer for:
  - RPC,
  - explorer APIs,
  - market APIs.
- Standardize per-source behavior:
  - timeout,
  - retry budget,
  - fallback order,
  - circuit-breaker cache.
- Add source confidence metadata (on-chain direct vs subgraph vs market API).
- Add webhook signature validation for Moralis endpoint before production ingestion.

## Phase 2 (1–2 weeks): UI system unification and premium polish pass

- Select one shell architecture as canonical (prefer reusable `src/shell` primitives).
- Build component state matrix for every critical component:
  - loading,
  - empty,
  - error,
  - stale-data.
- Standardize typography tokens and spacing scale; remove one-off style drift.
- Add microcopy pass (plain language, investor-confidence tone).

## Phase 3 (1 week): Codebase architecture and testing

- Decompose `App.tsx` into feature modules:
  - portfolio summary,
  - wallets,
  - liquidity,
  - staking,
  - transactions,
  - settings.
- Introduce unit tests for:
  - transaction normalization,
  - payout decoding,
  - reserve math,
  - fallback ordering.
- Add integration tests for top 5 user journeys.

## Phase 4 (1 week): Community launch readiness

- Beta cohort from PulseChain community (20–50 wallets).
- In-app feedback widget + issue taxonomy.
- Public trust page:
  - data sources,
  - update frequency,
  - known limitations.
- Launch assets:
  - changelog,
  - comparison vs alternatives,
  - onboarding tutorial.

---

## 6) KPI targets for “best-in-class” positioning

- Time-to-first-meaningful-portfolio: **< 3s** on typical broadband.
- Successful refresh rate across all enabled sources: **> 99%** daily.
- Data discrepancy reports (user-submitted) per 1,000 sessions: **< 3**.
- 7-day retention for connected users: **> 35%**.
- NPS from PulseChain beta cohort: **> 45**.

---

## 7) Immediate next actions (this week)

1. Add a release gate checklist tied to objective pass/fail criteria.
2. Centralize endpoint configuration (remove hook-level hardcoded RPC duplication).
3. Wire abort signals fully through hooks and app-level fetches.
4. Add first reliability tests around fallback and decode logic.
5. Plan a design-system freeze pass before introducing new features.
