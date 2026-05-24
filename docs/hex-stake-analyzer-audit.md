# HEX Stake Analyzer Audit for PulsePort

## Purpose

This document audits the uploaded `Hex-Stake-Analyzer-main.zip` reference implementation to understand its data sources, staking model, pricing model, and calculation approach before deciding how HEX staking should be implemented in PulsePort.

This audit is for planning only. It does not copy source code, does not import the reference repository, and does not implement HEX staking in PulsePort.

## Executive Summary

The reference project is a useful HEX staking domain reference, especially for native HEX stakes, HSI/HTT discovery concepts, T-share metrics, yield calculations, pHEX/eHEX separation, and user-facing stake analytics.

However, it is not architecturally suitable to copy directly into PulsePort. The reference implementation is a single-file, frontend-only analyzer that performs public RPC/API reads and local JavaScript calculations in the browser. PulsePort is moving toward a backend DTO and canonical-truth architecture, so the right approach is to use this project as research input, then design a backend-first HEX staking module.

Recommended direction:

```text
reference analyzer
  -> documentation audit
  -> backend HEX stake DTO contract
  -> backend native PulseChain HEX stake reader
  -> raw observations / provenance
  -> yield and dailyData support
  -> ended stake discovery
  -> HSI / HTT support
  -> pricing observations and PnL
  -> frontend transition panel
  -> full dashboard integration
```

## Repository Overview

The uploaded reference repository appears to be structurally small:

```text
Hex-Stake-Analyzer-main/
├─ README.md
├─ LICENSE
└─ index.html
```

The application model is:

- Single-file browser application.
- No backend service.
- No database.
- No wallet connection required for signing.
- Reads public chain/API data directly from the browser.
- Performs stake/yield/valuation/PnL calculations locally in JavaScript.
- Uses session-level browser storage for temporary cache behavior.

The `LICENSE` indicates GPL-3.0. PulsePort should not copy implementation code directly into production code without a license review. The safe path is to use the reference as domain research and reimplement the required concepts independently.

## Architecture Classification

| Area | Reference implementation | PulsePort target |
| --- | --- | --- |
| Runtime | Browser-only single HTML app | Backend DTO + frontend rendering |
| Data access | Direct browser RPC/API calls | Backend upstream ingestion/read services |
| Persistence | No durable backend persistence | Future raw observations / canonical state |
| Pricing | Browser API calls + static tables | Persisted price observations with provenance |
| PnL | Local frontend calculation | Backend-computed DTO output |
| Stake discovery | Browser contract/API reads | Backend service / source-family readers |
| UX | Strong analytical staking dashboard | Reusable concepts, not copied code |

## Data Sources Identified

| Data source | Purpose in reference analyzer | Chain | PulsePort suitability |
| --- | --- | --- | --- |
| PulseChain RPC | pHEX stake data, wallet balance, global HEX state, dailyData | PulseChain | Suitable as backend upstream input only |
| Ethereum RPC | eHEX stake data, wallet balance, global HEX state, ended stake logs | Ethereum | Suitable as backend upstream input only; Ethereum support should be documented before implementation |
| PulseScan API | Ended stake / log acceleration | PulseChain | Possible upstream accelerator, not sole truth |
| Blockscout Ethereum API | Ended stake / log acceleration | Ethereum | Possible upstream accelerator, not sole truth |
| HEX contract | Native stake and global HEX state | Ethereum + PulseChain | Core upstream contract source |
| Hedron HSIM contract | HSI stake discovery | Ethereum + PulseChain / unclear exact support | Useful later scope; not first slice |
| Actuator contract | Actuator / HTT delegated stake discovery | PulseChain-oriented | Useful later scope; not first slice |
| Bridged eHEX contract on PulseChain | eHEX balance split | PulseChain | Useful for pHEX/eHEX distinction, needs explicit asset identity |
| DexScreener API | Live price lookup | Both / market-dependent | Not suitable as primary truth; only possible price observation source with provenance |
| CoinGecko API | Fallback price / historical chart ranges | Both / market-dependent | Not suitable as primary truth without provenance and persistence |
| CoinPaprika API | Fallback ticker-style price source | Unknown / market-dependent | Not suitable as primary truth |
| Hardcoded historical tables | Historical pHEX/eHEX price or daily stats reference | Both / project-specific | Useful as research; risky as hidden production truth |
| sessionStorage | Temporary scan/cache state | Browser-local | Not production truth |

## Contract and Chain Setup

The reference appears to use the canonical HEX contract address:

```text
HEX = 0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39
```

The audit notes that HEX uses the same address on Ethereum and PulseChain, while state diverges after the PulseChain fork.

Additional contracts observed conceptually:

```text
HSIM     = 0x8BD3d1472A656e312E94fB1BbdD599B8C51D18e3
ACTUATOR = 0x0d5d61FDDf84feFAB26f98164D8009022d740206
```

Representative RPC endpoints observed conceptually:

```text
PulseChain:
- https://rpc.pulsechain.com
- https://pulsechain-rpc.publicnode.com
- https://rpc-pulsechain.g4mm4.io
- https://pulsechain.drpc.org

Ethereum:
- https://ethereum-rpc.publicnode.com
```

Explorer API concepts:

```text
Ethereum Blockscout API:
- https://eth.blockscout.com/api

PulseChain scan API:
- https://api.scan.pulsechain.com/api
```

PulsePort implication: these should be treated as upstream sources with explicit provenance, not as frontend truth.

## HEX Contract Methods and Selectors

The reference implementation uses or derives selectors for important HEX contract calls, including:

```text
stakeCount(address)
stakeLists(address,uint256)
currentDay()
dailyDataRange(uint256,uint256)
globalInfo()
balanceOf(address)
```

### Method Roles

| Method | Purpose |
| --- | --- |
| `stakeCount(address)` | Count native HEX stakes for a wallet |
| `stakeLists(address,uint256)` | Read native stake details by index |
| `currentDay()` | Determine current HEX day |
| `dailyDataRange(uint256,uint256)` | Read daily payout/share data for yield calculations |
| `globalInfo()` | Read share rate, shares total, and global HEX metrics |
| `balanceOf(address)` | Read liquid HEX or token balance |

PulsePort should model these as backend read primitives, not React/browser calls.

## Stake Discovery Model

The reference implementation supports or describes multiple stake categories.

### Native HEX Stakes

Native stakes are discovered through:

```text
HEX.stakeCount(wallet)
HEX.stakeLists(wallet, index)
```

This should be PulsePort's first HEX staking implementation slice.

### HSI Stakes

The reference includes concepts for Hedron HSI discovery:

- Untokenized HSI.
- Tokenized HSI NFT.
- HSIM-owned or HSIM-managed stake access paths.

These are important but should be separate later phases because they add ownership indirection and source-family complexity.

### HTT / Actuator Delegated Stakes

The reference also includes concepts for Actuator or HTT delegated stakes. These should not be part of the first PulsePort HEX stake PR. They should become a separate source family after native stake support is stable.

## Ended Stake Discovery

Ended stake discovery is materially harder than active native stake discovery.

The reference approach appears to use:

1. Explorer API lookup first.
2. Fallback to chunked `eth_getLogs` scanning.
3. Special handling for truncation, rate limits, or failed explorer responses.

PulsePort implication:

- Explorer APIs are useful accelerators.
- RPC log scanning is needed as fallback.
- Both should happen backend-side.
- Results should be saved or cached as raw observations once persistence exists.
- Frontend should not scan ended stake logs.

## Pricing Model

The reference uses several price-source concepts:

- DexScreener live price.
- CoinGecko fallback price and historical range data.
- CoinPaprika fallback ticker data.
- Hardcoded pHEX/eHEX historical price tables.

PulsePort should not treat any of these as silent truth.

Recommended PulsePort model:

```text
price_observation:
  assetId
  chainId
  quoteAsset
  price
  sourceType
  sourceId
  observedAt
  staleAfterSeconds
  confidence
  rejectedReasons
```

Pricing and valuation should remain explicit DTO statuses until a persisted pricing strategy exists:

```text
pricing.status = available | unavailable | stale | low_confidence | unsupported
valuation.status = available | unavailable | partial | unsupported
```

## Calculation Model

The reference implementation calculates or displays the following HEX staking concepts.

### Active Stakes

Active stakes are derived from native or HSI/HTT stake source calls, then classified by lock day, staked days, unlocked day, current day, principal, and shares.

### Total Staked HEX

Total staked HEX is summed from active stake principals, usually using hearts-to-HEX conversion.

### T-Shares

T-shares are derived from `stakeShares`. A common display unit is:

```text
T-Shares = stakeShares / 1e12
```

The exact unit conversion should be verified during backend implementation against HEX contract units.

### Yield

Yield is calculated from daily payout data:

```text
daily yield contribution = stakeShares * payoutTotal / stakeSharesTotal
```

Total stake yield is the sum over stake-active days.

### Daily Yield Rate

Daily yield rate is derived from the most recent dailyData payout/share values and the stake's share amount.

### Current Value

For active stakes, the reference concept is roughly:

```text
currentValue = (principal + accruedYield) * livePrice
```

For ended stakes:

```text
endedValue = (principal + finalYield) * priceAtEndDay
```

### Cost Basis

The reference concept uses start-day price and principal, with special fork treatment:

```text
costBasis = principalHex * priceAtLockedDay
```

For PulseChain forked copies, the reference appears to treat cost basis as zero.

PulsePort should not hardcode this policy without explicit user-facing documentation and DTO provenance.

### PnL

PnL is derived as:

```text
pnl = currentOrEndedValue - costBasis
pnlPercent = pnl / costBasis
```

PulsePort should not compute this in frontend components. It should be backend-computed after price provenance and cost-basis policy are explicit.

## T-Share Metrics

The reference provides useful T-share analytics concepts:

- Current T-share price.
- T-share price paid.
- Average T-share price paid.
- Active T-shares.
- Yield per T-share.
- Chain-specific T-share pricing for pHEX/eHEX.

Potential PulsePort DTO concept:

```ts
tShareMetrics: {
  chainId: number;
  shareRate: string;
  tSharePriceHex: string;
  tSharePriceUsd: string | null;
  activeTShares: string;
  averagePaidUsdPerTShare: string | null;
  pricingStatus: 'available' | 'unavailable' | 'partial';
  warnings: string[];
}
```

## Big Pay Day Handling

The reference includes Big Pay Day handling concepts. Big Pay Day is a special HEX event and should be modeled explicitly rather than hidden inside generic yield calculations.

PulsePort should distinguish:

```text
bpdYieldStatus = exact | estimated | not_applicable | unavailable
```

This matters because active/pending stakes and ended stakes may have different levels of certainty depending on source data and whether the stake has already settled.

## pHEX / eHEX Distinction

The reference strongly distinguishes pHEX and eHEX. PulsePort should do the same using explicit chain-aware identity.

Do not use only:

```text
symbol = HEX
```

Use an asset identity like:

```text
chain:369:erc20:0x2b591e99afe9f32eaa6214f7b7629768c40eeb39
chain:1:erc20:0x2b591e99afe9f32eaa6214f7b7629768c40eeb39
```

This is especially important because HEX contract address may be the same across Ethereum and PulseChain, while the assets, liquidity, prices, and histories are not the same after fork.

## Forked Copy Cost Basis Policy

The reference appears to treat PulseChain forked copies as zero-cost-basis positions under certain conditions. This may be a valid analytical view for some users, but it is a policy choice, not a neutral fact.

PulsePort should model this as an explicit backend policy:

```text
costBasisPolicy = user_supplied | acquisition_price | fork_copy_zero_basis | unavailable
```

For early implementation, PulsePort should avoid promising PnL on forked copied positions until the policy is explicit.

## Risks for PulsePort

Patterns that should not be copied directly:

| Risk | Reason |
| --- | --- |
| Frontend RPC as portfolio truth | Breaks backend DTO architecture |
| Frontend stake/PnL calculations | Hard to test, audit, and rebuild |
| Browser ended-stake log scanning | Slow and fragile |
| Live price APIs as hidden truth | Missing provenance/staleness/confidence |
| Hardcoded historical price tables | Risk of stale or unverifiable valuations |
| sessionStorage as accounting cache | Not durable or auditable |
| Symbol-only identity | Cannot safely distinguish pHEX/eHEX |
| GPL source copy | Potential license contamination risk |
| HSI/HTT all-at-once implementation | Too much complexity for first slice |
| Fork cost basis assumptions | Needs explicit policy and user-facing explanation |

## Reusable Ideas

Useful ideas to reuse conceptually:

- pHEX/eHEX separation.
- Native / HSI / HTT stake source categories.
- Active / pending / overdue / ended stake status vocabulary.
- Principal, yield, shares, T-shares, and daily yield display.
- T-share metrics.
- Explorer-first, RPC-fallback discovery strategy for ended stakes.
- Warning labels for incomplete or estimated data.
- Snapshot-friendly stake summary UI.
- Separate realized and unrealized stake performance concepts.
- Explicit display of cost basis and current value, once backend policies exist.

## Recommended PulsePort Implementation Path

### Phase 1: Documentation Audit

Commit this document as `docs/hex-stake-analyzer-audit.md`.

No runtime code.
No HEX staking implementation.
No copied reference source.

### Phase 2: Backend HEX Stake DTO Contract

Create DTO types only, for example:

```ts
type HexStakeDashboardDto = {
  schemaVersion: 'v1';
  walletAddress: string;
  chainId: number;
  asOf: string;
  status: 'available' | 'partial' | 'unavailable';
  positions: HexStakePositionDto[];
  tShareMetrics: HexStakeTShareMetricsDto | null;
  warnings: string[];
};
```

Potential position fields:

```text
stakeId
stakeSource: native | hsi | htt
stakeStatus: pending | active | overdue | ended
chainId
assetId
walletAddress
lockedDay
stakedDays
unlockedDay
principalHex
stakeShares
tShares
yieldHex
bpdYieldHex
bpdYieldStatus
pricing
valuation
pnl
provenance
warnings
```

### Phase 3: Native PulseChain Active Stakes Only

Backend reads:

```text
stakeCount(address)
stakeLists(address,index)
currentDay()
globalInfo()
```

Scope:

- PulseChain only.
- Native stakes only.
- Active/pending/overdue classification.
- No ended stakes.
- No HSI/HTT.
- No PnL.
- Pricing/valuation unavailable with warnings.

### Phase 4: DailyData and Yield

Backend reads or caches:

```text
dailyDataRange(start,end)
```

Adds:

- accrued yield estimate.
- daily yield rate.
- explicit estimated/exact status where appropriate.

### Phase 5: Ended Stake Discovery

Backend-side only:

- Explorer-first lookup.
- RPC fallback.
- Raw observation caching once persistence exists.
- Clear truncation/rate-limit warnings.

### Phase 6: HSI and HTT Source Families

Add separate source families:

```text
HEX_NATIVE
HEX_HSI
HEX_HTT
```

Do not mix these into native stake logic invisibly.

### Phase 7: Pricing and PnL

Add persisted price observations before PnL:

- pHEX price observations.
- eHEX price observations.
- historical daily price observations.
- explicit cost-basis policy.
- realized/unrealized PnL status.

### Phase 8: Frontend Integration

Follow the existing PulsePort transition approach:

```text
backend HEX stake DTO
  -> frontend transition panel
  -> regression tests
  -> full dashboard section
```

## Proposed First HEX Stake DTO Shape

```ts
export type HexStakeDashboardDto = {
  schemaVersion: 'v1';
  walletAddress: string;
  chainId: 369;
  asOf: string;
  status: 'available' | 'partial' | 'unavailable';
  positions: HexStakePositionDto[];
  summary: {
    activeStakeCount: number;
    endedStakeCount: number | null;
    totalPrincipalHex: string;
    totalTShares: string;
    accruedYieldHex: string | null;
    valuationStatus: 'unavailable' | 'partial' | 'available';
    warnings: string[];
  };
  tShareMetrics: {
    shareRate: string | null;
    tSharePriceHex: string | null;
    activeTShares: string | null;
    pricingStatus: 'unavailable' | 'partial' | 'available';
    warnings: string[];
  } | null;
  warnings: string[];
};

export type HexStakePositionDto = {
  stakeId: string;
  stakeSource: 'native' | 'hsi' | 'htt';
  stakeStatus: 'pending' | 'active' | 'overdue' | 'ended';
  chainId: 369;
  assetId: string;
  walletAddress: string;
  lockedDay: number;
  stakedDays: number;
  unlockedDay: number | null;
  principalHex: string;
  stakeShares: string;
  tShares: string;
  yieldHex: string | null;
  yieldStatus: 'unavailable' | 'estimated' | 'available';
  pricing: {
    status: 'unavailable' | 'available' | 'stale' | 'low_confidence';
    priceUsd: string | null;
    source: string | null;
    observedAt: string | null;
  };
  valuation: {
    status: 'unavailable' | 'partial' | 'available';
    valueUsd: string | null;
  };
  pnl: {
    status: 'unavailable' | 'partial' | 'available';
    realizedUsd: string | null;
    unrealizedUsd: string | null;
  };
  warnings: string[];
};
```

## Immediate Recommendation

The next PulsePort PR related to HEX staking should be docs-only:

```text
Branch: docs/hex-stake-analyzer-audit
PR title: docs: audit HEX stake analyzer data sources
File: docs/hex-stake-analyzer-audit.md
```

The next implementation PR after that should only add a DTO contract for native PulseChain HEX stakes. It should not implement HSI, HTT, ended stakes, pricing, or PnL.

## Conclusion

The reference HEX Stake Analyzer is valuable because it captures real HEX staking concepts that generic portfolio trackers often miss: T-shares, yield, pHEX/eHEX separation, HSI/HTT, ended stake discovery, Big Pay Day, and stake-level cost/performance analytics.

Its architecture is not suitable for direct integration into PulsePort. PulsePort should use it as research, then implement HEX staking through the backend DTO and eventual canonical truth model.

The highest-value safe next step is to preserve this audit in the repository, then design a minimal backend HEX stake DTO in a separate implementation PR.
