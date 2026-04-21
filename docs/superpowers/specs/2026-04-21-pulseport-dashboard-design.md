# Pulseport Dashboard Redesign Spec

Date: 2026-04-21
Project: Pulseport portfolio tracker
Scope: information architecture, wireframe structure, visual direction, and implementation boundaries for a production-ready React/Tailwind dashboard shell

## 1. Goal

Reshape Pulseport into a cleaner, more cohesive crypto portfolio workspace that keeps the useful functionality already present in the app while making the product easier to scan, navigate, and extend.

The target outcome is:

- visually cleaner, closer to the restraint of GoPulse
- functionally deep, preserving useful portfolio and transaction intelligence similar to plsfolio
- structured around exact asset identity and clear page ownership
- implemented as a reusable dashboard shell that existing modules can plug into incrementally

This is not a full rewrite spec. It is a shell and IA redesign that preserves existing product value.

## 2. Product Principles

### 2.1 Product posture

Pulseport is a portfolio operations product, not a marketing site.

That means:

- working surfaces come before hero copy
- numbers, filters, and ledgers must dominate the page
- decorative UI stays restrained
- navigation must reflect user tasks, not just feature existence

### 2.2 Primary user questions

The redesigned product should answer these questions quickly:

- What do I own right now?
- What was my original invested capital?
- What did that capital become after bridging and swapping into PulseChain?
- Which positions are up or down versus their original basis?
- What is happening in my transactions and bridges?
- What is my HEX and eHEX stake exposure, yield, and maturity timeline?

### 2.3 Data identity rules

Assets with different contracts, pricing behavior, or logos must be treated as different assets by default.

Examples:

- `HEX` and `eHEX` are different assets
- `DAI` and `pDAI` are different assets
- bridged tokens and native/fork copies are not interchangeable

Optional family grouping can exist later for analysis, but the default UI must remain exact-asset-first.

## 3. Existing App Surfaces To Preserve

The current app already contains useful surfaces and patterns that should be retained and reorganized rather than discarded:

- holdings table
- token detail modal
- token P&L card
- transaction list and normalization logic
- market watch modal
- profit planner modal
- staking section and staking ladder visualization
- bridge dashboard page
- PulseChain official reference page
- PulseChain ecosystem/community page
- liquidity sections

These should be refit into a stronger shell instead of rebuilt as disconnected one-off pages.

## 4. Proposed Navigation

Primary navigation:

- Dashboard
- Portfolio
- My Investments
- Transactions
- HEX Staking
- Wallets & Bridges
- Ecosystem

Supporting utilities:

- Market Watch
- Profit Planner / Exit Strategy
- Coin detail drawer
- Transaction detail panel

### 4.1 Navigation rationale

`Dashboard` is the daily command surface.

`Portfolio` is the current-state holdings and allocation view.

`My Investments` is the cost-basis and invested-capital view, driven by the user's API that fetches historical Ethereum and Base transactions.

`Transactions` is the raw ledger and source-of-truth drill-down page.

`HEX Staking` is separate because liquid HEX/eHEX and staked positions have different timelines and logic.

`Wallets & Bridges` is the operational cross-chain surface.

`Ecosystem` remains a reference and utility area for PulseChain infrastructure, tokens, bridges, and links.

## 5. Page Ownership

### 5.1 Dashboard

Purpose: daily command view for the whole portfolio.

Must answer:

- total value
- invested basis
- current P&L
- which holdings are material right now
- recent activity
- quick access into deeper tools

Key modules:

- top KPI row
- promoted holdings cards for any holding above `$100`
- portfolio performance chart
- market pulse / compact market watch
- recent transactions
- portfolio intel / alerts
- quick launches to Market Watch, Profit Planner, HEX Staking, and Bridges

Important rule:

- core coins are not forced into hero placement if they are below threshold
- any asset above `$100` can earn dashboard promotion

### 5.2 Portfolio

Purpose: exact current holdings and allocation.

Must answer:

- what assets do I own right now
- how much is each worth
- what share of the portfolio does each represent
- how is the portfolio distributed by wallet and chain

Key modules:

- total holdings / liquid value / token count / concentration metrics
- holdings table
- allocation chart
- wallet exposure chart
- optional compact launch into allocation calculator

Important rule:

- `Portfolio` is factual current state, not scenario planning

### 5.3 My Investments

Purpose: initial fiat or source-capital view mapped against what the user now owns on PulseChain.

Data source assumptions:

- the user has built an API that fetches relevant transaction history from Ethereum and Base
- the app can use those transactions to identify invested capital from assets such as `ETH`, `USDC`, `DAI`, and `USDT`
- cost basis is derived from historical transactions, not entered manually

Must answer:

- how much original capital was deployed
- how much that capital is worth now
- which current positions came from which source assets
- how swaps performed then versus now

Key modules:

- initial capital summary
- current value summary
- realized and unrealized P&L split
- funding source summary by chain and asset
- destination exposure summary
- investment table grouped by exact current asset
- row drill-down showing bridge source, swap path, transaction dates, and then-vs-now pricing
- embedded Profit Planner / Exit Strategy module

Important rule:

- default grouping is by current asset, with drill-down to original source funding

### 5.4 Transactions

Purpose: ledger and audit surface.

Must answer:

- what transactions happened
- on which chain
- what was swapped or bridged
- what the value was then
- what the value would be now
- how individual transactions contributed to current positions

Key modules:

- search and filters
- main transaction table
- detail panel or expandable row
- bridge summary
- swap summary
- best/worst transaction analysis

Important rule:

- transactions are shown as exact token in/out events, never normalized into "same coin" families by default

### 5.5 HEX Staking

Purpose: total HEX system exposure across liquid and staked positions while keeping `HEX` and `eHEX` visually separate.

Must answer:

- how much liquid `HEX` exists
- how much liquid `eHEX` exists
- how much is staked on each chain
- projected future yield from the staking ladder
- current T-share exposure
- maturity timing and stake-level detail

Key modules:

- combined hero summary
- stake distribution chart
- maturity ladder chart
- separate PulseChain and Ethereum summary blocks
- summary chips for staked totals, value, and T-shares
- expandable stake ledger

Important rule:

- `HEX` and `eHEX` are distinct holdings
- combined totals are allowed only as summary outputs after the split views

### 5.6 Wallets & Bridges

Purpose: operational cross-chain movement and bridge visibility.

Must answer:

- where assets sit by wallet
- what bridge routes have been used
- how much bridge exposure exists
- where funds moved between chains and PulseChain

Key modules:

- wallet totals
- bridge exposure
- bridge timeline
- multichain transaction table
- bridge source-to-destination flow mapping

### 5.7 Ecosystem

Purpose: PulseChain reference and discovery layer.

This page should consolidate the useful content already present in the existing official/community pages and bridge references:

- network setup
- safety notes
- official links
- core token reference
- bridged token reference
- DEXs and liquidity venues
- bridges and ramps
- analytics and discovery resources
- wallets, NFTs, and infrastructure tools

Important rule:

- this page is a reference surface, not a portfolio analytics page

## 6. Utility Surfaces

### 6.1 Market Watch

`Market Watch` should remain in the product but not as a primary top-level destination by default.

Recommended role:

- utility workspace accessible from Dashboard and Portfolio
- modal or secondary page depending on growth

Must support:

- token search
- volume / liquidity / market cap / 24H change views
- PulseChain, Ethereum, and Base market data

### 6.2 Profit Planner / Exit Strategy

The planner remains important but should sit inside `My Investments`, because it depends on current holdings, allocation, cost basis, and target outcomes.

Recommended role:

- embedded strategic tool inside `My Investments`
- optionally launchable from Dashboard

Must support:

- target profit
- target portfolio value
- time presets
- behavior presets
- expected growth by holding
- current versus projected value comparison
- allocation bar
- strategy tips
- exit strategy guidance

### 6.3 Allocation Calculator

The allocation calculator should not stay permanently fused into the primary holdings experience.

Recommended role:

- compact launcher from `Portfolio`
- deeper working view inside Profit Planner

Reason:

- current-state portfolio analysis and hypothetical allocation planning are different jobs

## 7. Interaction Model

### 7.1 Coin interactions

Clicking a coin should open a shared coin detail experience.

Recommended behavior:

- desktop: right-side drawer or inline expansion
- mobile: dedicated detail screen or bottom sheet

Coin detail contents:

- token header with icon, exact name, and chain/source badge
- current price
- amount held
- current value
- portfolio percentage
- price stats
- holdings stats
- P&L and cost basis
- contract and external links

### 7.2 Stake interactions

Clicking a stake should expand inline inside the staking ledger by default.

Recommended behavior:

- desktop: inline expansion
- mobile: accordion or detail sheet

Stake detail contents:

- stake id
- chain
- wallet
- locked duration
- principal
- active yield
- daily yield
- current value
- maturity value
- T-shares
- timeline
- progress

### 7.3 Transaction interactions

Clicking a transaction should open a detail panel or expanded row showing:

- chain
- exact token in/out
- bridge or swap route
- fees
- protocol
- historical value
- current equivalent value if applicable

## 8. Low-Fidelity Wireframe Spec

### 8.1 Global shell

```text
┌ Sidebar ─────────────────┬──────────────────────────────────────────────────────────────┬ Optional right rail
│ Pulseport                │ Top utility bar                                              │ contextual only
│ Dashboard                │ Search | Wallet | Chain | Time | Refresh                    │
│ Portfolio                │                                                              │
│ My Investments           │ Page title + short utility subtitle                          │
│ Transactions             │                                                              │
│ HEX Staking              │ Main content grid                                            │
│ Wallets & Bridges        │                                                              │
│ Ecosystem                │                                                              │
└──────────────────────────┴──────────────────────────────────────────────────────────────┴────────────────────
```

### 8.2 Dashboard

```text
[Header]
Dashboard
Current portfolio state across PulseChain, Ethereum, and Base

[Row 1]
Total value | Invested basis | Net P&L | 24H move

[Row 2]
Promoted holdings cards for all holdings above $100

[Row 3]
Portfolio performance chart | Market pulse / compact market watch

[Row 4]
Recent transactions | Portfolio intel / alerts

[Row 5]
Quick launches: Market Watch | Profit Planner | HEX Staking | Bridges
```

### 8.3 Portfolio

```text
[Header]
Portfolio
Asset filter | wallet filter | chain filter | time range

[Row 1]
Holdings value | liquid value | token count | concentration metric

[Row 2]
Holdings table | Allocation chart / wallet exposure

[Row 3]
Expandable holdings rows or coin drawer

[Secondary action]
Open Allocation Calculator
```

### 8.4 My Investments

```text
[Header]
My Investments
Initial capital from Ethereum/Base mapped to current PulseChain ownership

[Row 1]
Initial deployed capital | Current value | Net P&L | Realized/Unrealized

[Row 2]
Funding source summary | Current destination exposure

[Row 3]
Investment table grouped by exact current asset

[Expanded row]
Bridge source
Swap path
Transaction dates
Then value
Now value
Net P&L

[Row 4]
Profit Planner / Exit Strategy module
```

### 8.5 Transactions

```text
[Header]
Transactions
Search | chain | wallet | type | token | date range

[Main]
Transaction table

[Detail]
Expanded transaction detail or side panel

[Support]
Bridge summary | Swap summary | Best/Worst transaction analysis
```

### 8.6 HEX Staking

```text
[Header]
HEX Staking
Active, projected, and maturity estimates across PulseChain and Ethereum

[Row 1]
Combined current value | projected yield remaining | daily yield | total T-shares

[Row 2]
Stake distribution | Maturity ladder

[Row 3]
PulseChain summary block | Ethereum summary block

[Row 4]
Summary chips for staked totals and value

[Row 5]
Expandable stake ledger
```

### 8.7 Wallets & Bridges

```text
[Header]
Wallets & Bridges
Wallet | chain | bridge | date

[Row 1]
Wallet totals | bridge exposure | recent bridge count

[Row 2]
Wallet summary by chain | Bridge flow timeline

[Row 3]
Multichain transaction table

[Row 4]
Bridge source-to-destination mapping
```

### 8.8 Ecosystem

```text
[Header]
Ecosystem
Network setup, tools, bridges, contracts, and discovery

[Section 1]
Network reference + safety notes

[Section 2]
Core token and bridged token reference

[Section 3]
DEXs and liquidity

[Section 4]
Bridges and ramps

[Section 5]
Analytics and discovery

[Section 6]
Wallets, NFTs, and tooling
```

## 9. Visual Direction Board

### 9.1 Aesthetic direction

Recommended direction:

- structural cleanliness inspired by GoPulse
- functional depth inspired by the user's current plsfolio-style analytics
- dark-first, premium, operator-grade workspace
- selective neon financial instrumentation on top of restrained surfaces

### 9.2 Visual thesis

A clean PulseChain portfolio terminal that feels precise and premium, with calm dark surfaces, sharp number hierarchy, and selective electric color only where money, motion, and state matter.

### 9.3 Tone

- clean
- technical
- high-trust
- slightly futuristic
- non-generic
- restrained

### 9.4 Typography

Recommended pair:

- headings and large metrics: `Sora`
- UI text, table text, filters, and dense labels: `Manrope`

Usage rules:

- page titles: large and compact
- KPI numbers: oversized, high-contrast, tabular where possible
- table text: compact and readable
- system labels: small uppercase only when useful for grouping

### 9.5 Color system

Dark-first palette:

- background: near-black graphite
- surface: charcoal
- elevated surface: indigo-charcoal tint
- border: subtle graphite-violet
- primary accent: electric mint
- secondary accent: ultraviolet / indigo
- positive: mint green
- negative: coral red
- warning: amber
- informational links: cool lilac

Asset color guidance:

- `PLS`: mint/cyan family
- `PLSX`: blue-violet family
- `INC`: warm orange
- `HEX`: magenta/rose family
- `eHEX`: related but clearly distinct from `HEX`
- bridged stablecoins use their own token identity and logos, not normalized stablecoin styling

### 9.6 Surface treatment

Rules:

- do not turn every region into a heavy card
- prefer sections, dividers, and inset panels
- use cards only when a block is interactive, selected, or needs strong containment
- use thin borders and restrained shadows
- reserve glow for active or highlighted states only

### 9.7 Layout behavior

- fixed left sidebar
- compact top utility bar
- wide main content area for charts and tables
- contextual right rail only where needed

### 9.8 Motion

Recommended motion set:

- page-load stagger for nav, headers, and KPI row
- active nav and filter highlight transitions
- row expansion with fade and measured height animation
- chart reveal on initial load
- subtle drawer slide-in
- progress bars animate on mount

Avoid:

- floating particles
- constant pulsing glows
- ornamental motion in ledger-heavy pages

## 10. Implementation Boundaries

### 10.1 Immediate implementation target

The next implementation step should produce a production-ready React/Tailwind shell that:

- introduces the new dashboard navigation
- standardizes page headers and layout grid
- provides reusable shell primitives for KPI rows, section headers, filters, tables, and detail drawers
- preserves current working modules by mounting them inside the new shell

### 10.2 Non-goals for the first implementation pass

- full data-model rewrite
- removing existing feature depth
- replacing every current component at once
- merging distinct assets into grouped pseudo-assets

### 10.3 Recommended incremental migration

1. Build shell primitives and route/page scaffolding.
2. Place existing modules into the correct page ownership.
3. Standardize interactions for coin details, stake details, and transaction details.
4. Refine visual system and spacing.
5. Expand cost-basis views in `My Investments`.

## 11. Open Decisions Resolved In This Spec

- `Transactions` remains a dedicated page.
- `My Investments` is cost-basis and source-capital driven.
- Historical investment data is API-driven from Ethereum and Base.
- `Market Watch` is a supporting utility, not primary nav by default.
- `Profit Planner` belongs inside `My Investments`.
- `Allocation Calculator` is planning UI, not default holdings UI.
- `HEX` and `eHEX` are distinct assets.
- `DAI` and `pDAI` are distinct assets.
- Holdings above `$100` are promoted on the dashboard regardless of whether they are “core” coins.

## 12. Risks And Guardrails

### Risks

- keeping too many repeated surfaces across pages
- overusing cards and reducing scan quality
- accidentally treating bridged and native assets as equivalent
- mixing planning UI with current-state holdings UI
- building a visually louder shell than the data justifies

### Guardrails

- each page owns one clear job
- exact asset identity is the default everywhere
- current state and hypothetical planning remain separate
- modal/drawer interactions are standardized
- implementation stays surgical and incremental
