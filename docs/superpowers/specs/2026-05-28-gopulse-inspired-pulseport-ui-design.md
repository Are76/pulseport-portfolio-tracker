# GoPulse-Inspired PulsePort UI Design

Date: 2026-05-28

## Decision

PulsePort should move toward a dark, high-contrast, GoPulse-like interface: black canvas, white primary text, muted gray labels, green market/action accents, red negative movement, and minimal decorative color. The design should feel direct, readable, and crypto-native rather than warm, luxury, or dashboard-heavy.

The approved direction is:

- GoPulse token-page clarity as the visual reference.
- PulsePort wallet intelligence as the product differentiator.
- Every information box is clickable.
- First views stay light on text.
- Details appear through predictable drilldowns.

## Visual Style

The UI should use a clear black/white contrast model.

- Page background: black.
- Main panels: near-black with subtle borders.
- Text: white for primary values, gray for labels and secondary context.
- Accent: bright Pulse/GoPulse-like green for key positive/action states.
- Negative movement: clear red.
- Avoid pink, beige, gold, purple-heavy gradients, and warm finance styling.
- Use simple panel borders instead of glass, glow, or decorative backgrounds.

Typography should not feel like raw terminal output.

- Use a clean sans font for labels, navigation, headings, and normal UI copy.
- Use a tabular mono font only for prices, wallet addresses, ratios, and exact numeric values.
- Keep text short. Prefer labels, numbers, and compact state words over paragraphs.

## UX Principle

Every box is a doorway.

Any visible information unit must do one of these when clicked:

- Open a detail panel explaining the number.
- Navigate to a deeper page.
- Reveal evidence behind a signal.
- Open the relevant workflow.

No tile should be decorative or dead. If it looks tappable, it must be tappable.

## Information Architecture

Use progressive disclosure.

The first screen should show:

- Portfolio total.
- Key stats row.
- Chart or portfolio movement area.
- Compact signal row or panel.
- Main token/holding cards.
- Small detail panel or drawer for selected items.

The first click should answer: "why is this number here?"

The second click should open the full page or workflow.

Examples:

- Portfolio value -> value breakdown -> full holdings page.
- 24h change -> movement drivers -> transaction/value chart.
- Stakes -> stake summary -> stake ladder.
- LP -> pool summary -> DeFi page.
- Hidden noise -> hidden token list -> filter settings.
- Token card -> token detail -> PnL, liquidity, transactions, pools.
- Signal -> evidence -> relevant action.

## Interaction Pattern

Desktop:

- Clicking a stat, signal, or card updates a right-side detail panel.
- Detail panel shows breadcrumb, short explanation, key facts, and one or two actions.
- Large actions can navigate to a full page.

Mobile:

- Clicking opens a bottom sheet with the same detail structure.
- Bottom sheet should expose one primary action and one secondary action.
- Users should be able to dismiss and return to the exact scroll position.

Navigation should always preserve orientation:

- Use breadcrumbs in detail views.
- Keep active selections visibly highlighted.
- Keep labels stable between overview cards and detail pages.

## Content Style

Keep the surface low-text.

Good:

- `Liquid`
- `$72K`
- `Stakes`
- `18`
- `1 due soon`
- `PLSX strength`
- `+4.1%`

Avoid:

- Long explanatory paragraphs in cards.
- Marketing copy.
- Repeating how the app works inside the UI.
- Dense helper text unless the user has opened a detail panel.

## Components To Create Or Refactor

The implementation should move toward reusable UI pieces:

- `MetricTile`: clickable stat with label, value, secondary line, state color.
- `SignalRow`: compact row with status strip, label, value/action.
- `TokenMarketCard`: GoPulse-like token card with symbol, price, movement, ratio.
- `DetailPanel`: right-side desktop drilldown panel.
- `DetailSheet`: mobile drilldown sheet.
- `DetailBreadcrumb`: orientation trail.
- `TimeRangeControl`: compact `24h / 7d / 30d / 90d` segmented control.

These components should use shared design tokens instead of inline one-off colors.

## Data Mapping

The UI should be data-source agnostic. It can start by using current frontend-derived data, but the shape should prepare for backend DTO migration.

Suggested detail types:

- `portfolio_change`
- `stake_summary`
- `lp_summary`
- `hidden_tokens`
- `token_market`
- `wallet_signal`

Each detail type should provide:

- breadcrumb
- title
- short summary
- key facts
- primary action
- secondary action

## Testing And Verification

Before implementation is considered complete:

- Verify desktop and mobile layouts in browser.
- Confirm every visible tile/card/signal is clickable or intentionally non-clickable.
- Confirm focus states and keyboard activation work.
- Confirm text contrast on black background.
- Confirm no text overflow in stat cards.
- Confirm detail panel/sheet updates correctly.
- Run `npm run lint`, `npm run test`, and `npm run build`.

## Non-Goals

This spec does not require:

- Copying GoPulse branding, logo, or proprietary assets.
- Implementing real charting changes immediately.
- Rewriting the backend.
- Solving all portfolio data accuracy issues.

The goal is to define and implement the UI/UX direction cleanly, then wire deeper data over time.
