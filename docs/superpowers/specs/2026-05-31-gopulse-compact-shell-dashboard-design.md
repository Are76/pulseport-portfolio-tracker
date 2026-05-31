# GoPulse Compact Shell And Dashboard Design

Date: 2026-05-31
Status: approved
Project: Pulseport portfolio tracker

## Goal

Establish the production design language for Pulseport and make the dashboard a complete, reliable daily portfolio surface.

The approved direction is `GoPulse Compact + Token Hybrid`:

- dark-first with a fully designed light mode
- compact crypto-native presentation inspired by GoPulse restraint
- clear black-and-white contrast with restrained green and red semantics
- token holdings as the dashboard's primary content
- progressive disclosure for secondary intelligence
- no decorative or dead controls

This first redesign branch updates the global shell and the dashboard together. Later branches refine the remaining pages while inheriting the same shell and design system.

## Redesign Program

The full app redesign is delivered side by side so each pull request can be reviewed in the browser:

1. `shell-dashboard`: global shell, design system, and dashboard.
2. `wallets`: holdings, filtering, wallet state, and token drilldown.
3. `stakes`: HEX stake summary, maturity, and detail workflows.
4. `transactions`: history, search, filtering, and transaction details.
5. `defi`: LP, farms, and liquidity details.
6. `bridges`: bridge status and transaction flow.
7. `polish`: mobile QA, accessibility, and cross-page visual consistency.

PR #124 remains a stability and accessibility foundation. Start `shell-dashboard` from updated `master` after PR #124 is merged.

## Global Shell

The shell becomes the shared visual contract for all pages.

### Sidebar

- Use a compact near-black sidebar in dark mode and a high-contrast neutral sidebar in light mode.
- Keep the Pulseport brand visible without the current terminal framing.
- Use stable navigation labels: `Dashboard`, `Wallets`, `HEX Stakes`, `Transactions`, `Bridges`, and `DeFi`.
- Use icons and restrained active states. Avoid blue glow, gradient decoration, and large rounded containers.
- Preserve wallet selection and add-wallet workflows.
- Remove one-off inline visual styling where the shell tokens can own the result.

### Top Menu

- Make the top menu quieter and shorter than the current workspace header.
- Preserve page title, refresh status, theme toggle, API settings, and refresh action.
- Reduce helper text and visual chrome.
- Use the same dark/light token contract as the sidebar and dashboard.
- Keep controls compact and accessible with clear labels and focus states.

### Background

- Use a near-black canvas in dark mode with subtle surface separation.
- Use a clean neutral background in light mode.
- Remove shell gradient decoration and glass blur where it does not improve hierarchy.
- Use borders and spacing, not glow, to separate sections.

## Dashboard Information Architecture

The dashboard answers:

- What is my portfolio worth?
- Which tokens matter most?
- What changed?
- What needs my attention?
- Where do I go next?

The order is:

1. Compact portfolio hero with total value and functioning time-range control.
2. Four compact metrics: portfolio move, stakes, liquidity, and hidden noise.
3. Token-hybrid region where holdings dominate.
4. Secondary allocation and signal regions.
5. Detail drawer on desktop or detail sheet on mobile after user selection.

The default desktop layout does not permanently reserve space for a right-side detail panel.

## Token Hybrid

Token holdings are the primary dashboard content.

- Show up to four leading tokens as clickable token cards.
- Include symbol, wallet value, current price, portfolio share, and movement where available.
- Keep card styling flat and compact.
- Keep allocation and signals visible as secondary context.
- Open the exact selected token detail, never a generic fallback unless data is genuinely unavailable.

## Drilldown Contract

Every visible information box must be either actionable or clearly static.

### Desktop

- Clicking a metric, token card, allocation segment, or signal opens a focused side drawer.
- The drawer starts closed.
- The drawer contains breadcrumb, concise explanation, key facts, and one or two real actions.
- Closing the drawer returns focus to the launching element.

### Mobile

- Use the existing accessible bottom-sheet pattern.
- Preserve focus management, Escape dismissal, backdrop dismissal, safe-area padding, and focus restoration.
- Keep the bottom navigation usable when the sheet is closed.

### Exact Selection

- Token detail IDs must carry exact asset identity.
- Product-page actions must open the asset the user selected.
- Unknown detail IDs may show an unavailable state, but must not silently display unrelated portfolio-change content.

## Functional Requirements

The first branch must fix the confirmed dashboard interaction gaps:

- `24h`, `7d`, `30d`, and `90d` time-range buttons update the selected range and displayed context.
- Allocation segments are interactive or are visually presented as static. The preferred implementation is interactive drilldown.
- Live token cards open details for the exact clicked token.
- Token detail actions open the correct product page.
- Metrics, signals, token cards, and drawer actions perform the navigation or drilldown suggested by their labels.
- No visible button is a placeholder.

## Visual Tokens

Use a shared shell and Atlas token system.

Dark mode:

- near-black page canvas
- slightly lifted near-black surfaces
- white primary text
- muted gray supporting text
- restrained green positive and action states
- clear red negative states

Light mode:

- neutral light page canvas
- white surfaces
- dark primary text
- muted gray supporting text
- darker green positive and action states
- darker red negative states

Avoid:

- blue or purple gradient atmosphere
- glow-heavy active states
- pink backgrounds
- gold or warm finance styling
- decorative glass blur
- monospace typography outside addresses and exact technical values
- deeply rounded card-heavy composition

## Data Model

Keep the UI data-source agnostic so frontend-derived values can migrate to backend DTOs later.

Extend the dashboard snapshot and detail model so a selected token carries:

- exact asset ID
- symbol and display name
- current price
- wallet value
- portfolio share
- movement
- chain or contract identity where available
- product-page navigation target

Time-range state must be explicit and flow into the hero, details, and any range-aware values.

## Accessibility

- Preserve keyboard activation for cards and actions.
- Use visible focus states.
- Maintain focus containment and focus restoration for drawer and sheet overlays.
- Preserve accessible labels for the mobile navigation.
- Use contrast-safe text/background pairs in both themes.
- Ensure touch targets remain at least 44px for primary mobile controls.

## Verification

Before the `shell-dashboard` branch is complete:

- verify desktop dark mode
- verify desktop light mode
- verify mobile dark mode
- verify mobile light mode
- click every visible dashboard interaction
- confirm exact token drilldown and product-page navigation
- confirm all time ranges change state
- verify drawer and bottom-sheet keyboard behavior
- run focused component tests
- run `npm.cmd run lint`
- run `npm.cmd run build`
- run the full test suite and report any pre-existing failures separately

## Non-Goals

The first branch does not:

- redesign Wallets, HEX Stakes, Transactions, DeFi, or Bridges page content
- rewrite backend logic
- add new portfolio data providers
- copy GoPulse branding or proprietary assets
- attempt a single large redesign PR for every page

Those pages inherit the new shell and receive focused redesign branches later.
