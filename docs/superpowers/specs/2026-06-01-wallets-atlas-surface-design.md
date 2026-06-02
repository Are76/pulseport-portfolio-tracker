# Wallets Atlas Surface Design

Date: 2026-06-01
Status: proposed
Project: Pulseport portfolio tracker

## Goal

Make the `Wallets` page the first real product-surface migration after the shell/dashboard work.

This slice should:

- move the Wallets experience toward a clearer page structure inspired by `PulsePort`
- keep the current tracker functionality intact
- apply the approved Atlas visual language to the main Wallets surfaces
- avoid introducing new frontend truth logic that fights the future `CoinPulse` backend direction

The result should feel like the same product family as the current Atlas dashboard rather than an older utility page living inside the shell.

## Scope

This slice covers the Wallets page only.

It includes:

- Wallets summary hero
- wallet scope selection
- chain filtering
- coin visibility controls
- holdings surface
- per-wallet and combined holdings modes
- transaction handoff points from the Wallets surface
- hidden/manual/support sections that belong to the Wallets workflow
- Atlas-style treatment of the primary boxes and sections

It does not include:

- a backend rewrite
- a new pricing engine
- new PnL truth logic
- a full transactions redesign
- a DeFi, HEX Stakes, or Bridges redesign

## Product Direction

The Wallets page should answer:

- what do my connected wallets hold right now
- which wallet or chain is driving the visible holdings
- which assets matter most
- what is hidden, noisy, manual, or uncertain
- where can I go deeper from here

That includes a clear path from holdings into relevant transaction context.

The page should feel compact, calm, and portfolio-native:

- dark-first
- flat surfaces rather than glossy cards
- strong contrast
- restrained green and red semantics
- clear interactive affordances
- no decorative blue glow or random color drift

## Information Architecture

The Wallets page should be organized in this order:

1. Wallets page header inside the global shell
2. Wallets hero / summary surface
3. Wallet scope and chain filters
4. Coin visibility control surface
5. Holdings surface
6. Secondary wallet tools such as hidden/manual coin areas

The page should reduce the feeling of stacked unrelated boxes and instead read as one coherent holdings workspace.

## Atlas Theme Application

Atlas styling must be applied to the key Wallets boxes, especially:

- `All Wallets`
- `Coin visibility`
- `Assets`
- the holdings header area
- wallet scope pills and chain filters

Atlas application here means:

- consistent near-black elevated surfaces in dark mode
- consistent white surfaces in light mode
- white primary text in dark mode and dark primary text in light mode
- muted secondary text tokens shared with the shell
- accent used sparingly for selected filters, active wallet state, and key positive signals
- thin borders and spacing for hierarchy instead of glow-heavy decoration

These boxes should visually belong to the same system as the Atlas dashboard and token detail surfaces.

## Summary Surface

The Wallets summary area should remain actionable and compact.

It should show:

- selected wallet scope label or `All Wallets`
- total visible value
- liquid vs staking split
- token count
- primary add-wallet action
- light wallet-management actions when a specific wallet is selected

The current summary behavior may be preserved, but the presentation should be simplified and aligned with the Atlas dashboard tone.

## Wallet Scope

Wallet scope must remain easy to understand.

Requirements:

- `All` is always visible
- each wallet pill shows label and compact value context
- the selected wallet state is obvious
- wallet pills must feel like controls, not decorations
- the selection pattern should support later backend-backed per-wallet views

This section should borrow the readability of `PulsePort` while keeping the current tracker behavior.

## Chain Filters

Chain filtering remains part of the Wallets surface and should stay close to wallet scope.

Requirements:

- keep `All`, `PulseChain`, `Ethereum`, and `Base`
- visually match the Wallets Atlas controls
- preserve current filtering behavior
- avoid introducing dead toggles or misleading states

## Coin Visibility Surface

`Coin visibility` should become a clearer Atlas control section rather than a miscellaneous utility box.

It should contain:

- refresh / detect
- hidden coins entry
- add coin
- spam scan
- dust and spam visibility toggles
- restore/show-everything utilities

The surface should look deliberate and operational, with a cleaner hierarchy between:

- section title and explanation
- current visibility state
- primary actions
- secondary maintenance actions

## Holdings Surface

The holdings area is the heart of the page.

Requirements:

- support `Combined` and `Per wallet` modes
- keep sorting/filtering readable
- make it obvious what set of assets is currently shown
- preserve token click-through into the detail drawer / product flow
- preserve and clarify transaction entry points from wallet and token context
- preserve existing hiding/manual-entry behaviors where already supported

This section should borrow the stronger `PulsePort` page framing:

- a clear holdings section header
- an explicit view-mode switch
- a unified list/grid surface rather than many disconnected blocks

## Combined And Per-Wallet Modes

The Wallets page should expose these as first-class view modes.

### Combined

- shows all visible holdings in one unified surface
- optimized for ranking and scanning
- default mode

### Per wallet

- groups holdings by wallet
- each wallet section can collapse or expand
- wallet totals and token counts remain visible

The `PulsePort` pattern is the donor here, but styling should match the Atlas shell and surfaces.

## Interaction Rules

Every key surface should either be actionable or clearly static.

- wallet pills change scope
- chain pills change scope
- token rows/cards open the matching detail flow
- Wallets actions that reference activity must lead into the correct transaction context
- add wallet opens the wallet workflow
- hidden/manual actions open the relevant controls

No primary-looking control should be decorative only.

## Data Rules

This slice is presentation-first, not truth-first.

That means:

- use the current tracker Wallets data flow for now
- do not move valuation, pricing, or PnL computation deeper into new frontend components
- keep display logic close to the surface
- keep any future backend-aligned data seams obvious

If a UI surface needs additional computed presentation state, that state should be shallow and derived from existing page inputs rather than becoming a new hidden source of truth.

## Technical Direction

The implementation should move Wallets UI out of the large `App.tsx` surface into a more isolated page/component structure.

The first slice should prefer:

- extracting the Wallets page surface
- extracting Wallets-specific subcomponents where it meaningfully reduces complexity
- reusing existing table/detail components where possible
- keeping behavior stable while improving composition

Where Wallets already touches transactions, preserve those links and routing behavior instead of rebuilding transaction logic in place.

Do not attempt the full CoinPulse DTO migration in the same slice.

## Testing

Add focused coverage for:

- Wallets page rendering with Atlas-themed primary surfaces
- combined vs per-wallet mode switching
- wallet scope selection
- chain filter selection
- coin visibility panel actions that already exist
- token selection still opening the correct detail flow
- Wallets-originated transaction navigation still opening the expected context

Keep existing app-shell, routing, and Atlas interaction tests passing.

## Verification

Before this slice is complete:

- verify desktop dark mode
- verify desktop light mode
- verify Wallets page visual consistency against the Atlas dashboard shell
- click wallet scope controls
- click chain filters
- open and use coin visibility controls
- switch combined/per-wallet mode
- open token detail from the holdings surface
- verify Wallets-to-transactions handoff still works
- run focused tests
- run `npm.cmd run lint`
- run `npm.cmd run build`

## Success Criteria

We can call this slice successful when:

- the Wallets page feels like part of the Atlas product
- the major Wallets boxes share one visual system
- the page is easier to scan and understand
- combined and per-wallet views are explicit
- existing functionality is preserved
- the implementation leaves a cleaner seam for future CoinPulse-style backend alignment
