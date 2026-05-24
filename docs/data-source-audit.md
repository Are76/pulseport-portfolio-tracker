# PulsePort Data Source Audit (Phase 1)

Date: 2026-05-24
Scope: repository audit of current data-fetching and portfolio assembly model.

## Executive summary

PulsePort currently assembles portfolio truth in the frontend by combining:
- direct RPC reads (native balances + ERC20 contracts + stake contracts),
- explorer-style HTTP APIs,
- live market APIs (CoinGecko / DexScreener),
- local user state and fallback/mock data.

This is appropriate for a prototype, but it is **unsafe as production truth** for a reliable portfolio tracker.

## Classification key

1. **Safe presentation logic**: UI formatting/sorting/filters, explorer links, visual calculations not used as canonical portfolio truth.
2. **Upstream input**: external data input surface (RPC, scanner APIs, market APIs, wallet address input).
3. **Temporary prototype logic**: convenience fallback, optimistic assumptions, local cache, mock/demo behavior.
4. **Unsafe production truth logic**: frontend logic that derives balances/valuation/PnL from live inputs and treats it as current portfolio truth.

---

## Current data sources

### On-chain/RPC sources

- Chain RPC endpoints configured in frontend constants for PulseChain/Ethereum/Base, with fallback RPC lists.  
  **Classification:** (2) upstream input.  
  **Why risk:** endpoint variability, reorg/lag/inconsistency are absorbed directly in browser runtime.

- Frontend utility `withRpcFallback` iterates primary+fallback RPC URLs.  
  **Classification:** (3) temporary prototype logic + (2) upstream input.

- `App.tsx` creates viem public clients with fallback transport and performs `getBalance` and `readContract` calls directly from React runtime.  
  **Classification:** (4) unsafe production truth logic.

- `useLiquidityPositions` performs manual JSON-RPC multicalls (`eth_call`) and wallet/user farm reads directly against public RPC.  
  **Classification:** (4) unsafe production truth logic.

### Explorer / indexed HTTP sources

- PulseChain scanner endpoints referenced in utility/API helpers.  
  **Classification:** (2) upstream input.

- Blockscout/Etherscan/Basescan links and reads appear across transaction and bridge experiences.  
  **Classification:** links = (1), data fetches used for balances/tx assembly = (2)/(4).

### Price sources

- CoinGecko IDs are embedded in token configs, and CoinGecko endpoints are used in bridge dashboard flows.  
  **Classification:** (2) upstream input.

- DexScreener APIs used in Market Watch with multiple endpoint fallbacks.  
  **Classification:** (2) upstream input + (3) temporary prototype fallback pattern.

- Frontend price fallback constants/defaults are used in PnL and valuation branches when prices unavailable.  
  **Classification:** (3) temporary prototype logic, becoming (4) when used in totals/PnL truth.

---

## Current frontend fetch paths

### Wallet + portfolio assembly path (current)

wallet address input
-> frontend state
-> direct RPC/API calls from browser (viem + fetch)
-> frontend token/stake/liquidity/transaction transforms
-> frontend computed balances/value/PnL
-> rendered dashboard

**Classification:** overall (4) unsafe production truth logic.

### Identified frontend fetch modules

- `src/App.tsx`: central orchestration of wallet tracking, on-chain calls, transaction transforms, holdings valuation, and summary/PnL.
- `src/hooks/useLiquidityPositions.ts`: direct RPC calls + subgraph reads + frontend enriched LP valuation.
- `src/components/MarketWatchModal.tsx`: direct DexScreener fetches + watchlist parsing.
- `src/components/PnLModal.tsx` + `src/components/TransactionList.tsx`: frontend PnL math from current spot prices.
- `src/utils/localStorageDebounce.ts`: scanner API base paths and persistence helpers.

---

## Current wallet/RPC usage

- Wallet addresses are user-provided and propagated through frontend state to fetch hooks/components.
- Frontend creates chain clients, executes contract reads and balance reads directly.
- Frontend performs fallback RPC cycling.

**Risk:** no backend reconciliation, no canonical ingestion checkpoint, no persisted sync watermark, no deterministic replay.

---

## Current PnL calculation locations

- `src/components/PnLModal.tsx`: computes realized/unrealized estimates using current prices and notes historical prices are not stored.
- `src/components/TransactionList.tsx`: computes swap/deposit PnL cards from current asset prices.
- `src/App.tsx`: computes summary 24h, asset-level changes, and multiple valuation aggregates inline.

**Classification:** (4) unsafe production truth logic when treated as reliable portfolio performance.

---

## Current mock/fallback data and prototype behavior

- `MOCK_ASSETS`, `MOCK_STAKES`, `MOCK_HISTORY` in `App.tsx`.
- Default/fallback prices in PnL and valuation paths (`0.00005`, `3400`, etc.).
- Manual coin add flow allows user-defined balance and price to affect portfolio display.
- localStorage persistence for API keys and app state.

**Classification:** (3) temporary prototype logic.

**Risk:** mock/fallback values can leak into user-visible totals and implied truth.

---

## Token identity and spam filtering audit

### Token identity

- Token metadata in `constants.ts` uses chain+address entries, but multiple components and filters still match assets by symbol aliases.
- Several flows normalize/compare by symbol (`normalizeSymbol`, `sameAssetSymbol`, symbol fallbacks).

**Classification:** symbol-only matching = (4) unsafe production truth logic.

### Spam filtering

- Spam scan controls and hide/show behaviors are managed in frontend state/UI controls.
- If spam classification affects portfolio totals before backend canonicalization, this is unsafe.

**Classification:** spam UI toggles = (1); spam affecting canonical holdings math in frontend = (4).

---

## Risk register

1. **Frontend as source-of-truth** for holdings/PnL causes nondeterministic results per user/session/network.
2. **RPC inconsistency and fallback drift** can produce different results for same wallet.
3. **No persisted chain sync state** (block watermark/cursor) prevents reliable incremental updates.
4. **No canonical ledger model** (normalized transfers/swaps/events) blocks deterministic valuation and auditability.
5. **Spot-price-only PnL** without persisted price history/provenance yields unstable/incorrect performance.
6. **Symbol-based identity paths** risk asset conflation across chains/wrapped variants.
7. **Mock/fallback leakage** can contaminate perceived production truth.
8. **Frontend spam heuristics** can hide/show assets inconsistently across clients.

---

## Recommended migration plan (target model)

Target pipeline:

wallet address
-> backend sync job
-> raw chain observations
-> normalized transfers/swaps/events
-> canonical ledger
-> derived portfolio state
-> persisted price observations
-> backend-computed balances/valuation/PnL
-> DTO API
-> frontend dashboard

### Phase 1 — complete audit (this document)

- Freeze current truth surfaces and classify safe vs unsafe logic.
- Add explicit “prototype-only” labels for frontend fallback/mock paths.

### Phase 2 — move blockchain reads behind backend API routes

- Create backend ingestion endpoints/services for:
  - native balance reads,
  - ERC20 balances,
  - stake/LP position reads,
  - transaction/event acquisition.
- Frontend stops calling direct RPC for canonical portfolio data.
- Frontend consumes `/api/portfolio/:wallet` DTO only.

### Phase 3 — add minimal persisted sync state

- Persist per-wallet/per-chain sync cursors:
  - last scanned block,
  - last successful sync timestamp,
  - retry/error metadata.
- Add resumable idempotent sync jobs.

### Phase 4 — add derived portfolio DTO

- Backend returns stable DTOs:
  - holdings (chainId, tokenAddress, decimals, quantityRaw/quantity, valuationUsd),
  - liabilities/locked/staked buckets,
  - totals and quality flags.
- Frontend reduces to presentation-only formatting and filtering.

### Phase 5 — canonical ledger for transfers/swaps/events

- Persist normalized event records keyed by (chainId, txHash, logIndex).
- Build ledger derivation for:
  - transfers,
  - swaps,
  - LP mint/burn,
  - staking lock/unlock/reward.
- Compute balances from ledger reconciliation, not ad-hoc component math.

### Phase 6 — persisted price observations + provenance

- Store price observations with:
  - source (CoinGecko/DexScreener/other),
  - timestamp,
  - confidence/quality flag,
  - pair/liquidity metadata where available.
- Compute valuations/PnL on backend using timestamp-aligned pricing policy.

### Phase 7 — only then analytics/AI

- After deterministic ledger + valuation foundation, layer advanced analytics.

---

## Guardrails for implementation PRs (post-audit)

- No frontend direct-RPC as final portfolio truth.
- No symbol-only identity as canonical key.
- No React-side canonical balance/valuation/PnL computation.
- No mock data as production fallback.
- Keep UI unchanged while backend truth model is introduced.
- Keep scope PulseChain-first; avoid chain-expansion work during reliability migration.

---

## Suggested decomposition for upcoming engineering PRs

1. Backend schema PR: wallet sync cursor + raw observations tables.
2. Ingestion PR: chain reader workers and retry/backoff.
3. Normalization PR: transfer/swap/stake event mappers.
4. Pricing PR: persisted price snapshots and provenance.
5. DTO PR: portfolio summary/holdings/transactions API.
6. Frontend switch PR: read-only presentation over DTOs (remove direct truth math).
7. Cleanup PR: remove mocks/fallback truth paths and symbol-identity shortcuts.
