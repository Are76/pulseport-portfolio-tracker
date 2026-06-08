# Transaction Coverage and Portfolio Insights Audit

Date: 2026-06-03
Repository: `pulseport-portfolio-tracker`
Branch intent: `feat/transaction-coverage-and-insights-audit`

## Why this slice exists

Two product problems now block safe feature work:

1. The application appears to be surfacing far fewer transactions than the tracked wallet actually has.
2. `Portfolio Insights` is not behaving like a distinct, coin/CA-based insight surface. It currently reads too much like a second dashboard instead of answering:
   - what was spent into a coin,
   - what is currently held,
   - what the current value is,
   - and what contract-address-backed transaction context supports that reading.

Until those two issues are understood, new scenario calculators risk being built on top of incomplete or misleading transaction truth.

## Product intent

This slice is an **audit and correction slice**, not a broad redesign and not a backend rewrite.

The goal is to:

- identify where transaction coverage drops off,
- identify whether the drop is upstream, transform-layer, persistence, filtering, or UI truncation,
- define the correct contract for `Portfolio Insights`,
- and implement only the smallest corrections needed to stop the product from presenting the wrong mental model.

## Hard boundaries

This slice must **not**:

- add external APIs,
- introduce live pricing changes,
- rewrite portfolio accounting,
- migrate the full app to CoinPulse backend architecture in one PR,
- redesign every dashboard/page again,
- or build the prototype calculators yet.

This slice may:

- inspect current fetch limits/pagination/range logic,
- inspect merge/dedupe logic across PulseChain / Ethereum / Base transaction sources,
- inspect transaction filtering in UI,
- inspect how `Portfolio Insights` is fed and routed,
- adjust labels, routing, and presentation if they are materially misleading,
- add bounded tests and audit docs,
- add guardrails that prevent obvious partial-data misrepresentation.

## Core questions the audit must answer

### A. Transaction coverage

1. Where are transactions fetched from today for PulseChain, Ethereum, and Base?
2. Is there a hard cap, page size, cursor, block range, or time-window truncation?
3. Is there dedupe logic that accidentally drops valid events?
4. Are imported transactions filtered away after fetch because of:
   - wallet scoping,
   - unsupported action type mapping,
   - hidden/spam handling,
   - chain filter logic,
   - view-level limits,
   - or per-coin drill-down assumptions?
5. Is the issue in acquisition, transform, persistence/cache, or rendering?

### B. Portfolio Insights semantics

1. What is `Portfolio Insights` supposed to mean in this product?
2. Which transaction-backed facts should it show first?
3. Should it be anchored by:
   - exact asset identity,
   - contract address,
   - exact wallet scope,
   - and invested/spent/current relationships?
4. Which parts of the current dashboard snapshot are incorrectly reused there?

## Target interpretation for Portfolio Insights

`Portfolio Insights` should become a **coin / contract-address backed insight surface**.

Its job is not to restate dashboard tiles. Its job is to explain a coin position with transaction context.

Minimum intended questions it should answer:

- What exact asset is this?
- What contract address / chain identity is being analyzed?
- How much has this wallet or wallet-set spent into it?
- What quantity is currently held?
- What is the current visible value?
- What related transaction history supports that reading?

Where certainty is weak, the UI should say so explicitly rather than silently showing a polished but shallow duplicate of the dashboard.

## Non-goal clarification

This slice is **not** the full CoinPulse truth migration.

We are not promising perfect realized/unrealized PnL here.
We are not promising tax-lot accounting.
We are not promising full backend ledger migration in one pass.

We are only trying to stop the current product from:

- undercounting transactions without explanation,
- and presenting `Portfolio Insights` as something it is not.

## Expected outputs

This slice should produce:

1. A written audit of the current transaction coverage path.
2. A concrete root-cause finding list.
3. A bounded code fix set if root causes are small enough for one PR.
4. A corrected `Portfolio Insights` direction and surface contract.
5. Focused tests covering:
   - coverage/pagination/range handling where testable,
   - transform/dedupe behavior where testable,
   - and `Portfolio Insights` routing / rendering expectations.

## Success criteria

This slice is successful when:

- we can clearly explain why the app is not showing the expected transaction volume,
- the product no longer silently presents a misleading `Portfolio Insights` clone,
- the next feature slice can safely build on the corrected understanding,
- and any remaining gaps are documented as explicit follow-up work instead of hidden ambiguity.

## Follow-up sequencing after this slice

If this audit lands cleanly, the next likely order becomes:

1. targeted `Portfolio Insights` correction / CA-based surface completion,
2. prototype scenario calculators,
3. light-mode overhaul and remaining dashboard visual polish,
4. further design work on remaining surfaces.
