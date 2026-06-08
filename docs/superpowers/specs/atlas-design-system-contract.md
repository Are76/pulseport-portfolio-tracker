# Atlas Design System Contract

## Purpose

Atlas needs one coherent product language across Dashboard, Portfolio Insights, Wallets, Transactions, token surfaces, and modals. This contract exists to stop page-by-page improvisation and to give every future implementation one shared set of rules.

Lume may be used as inspiration for hierarchy, rhythm, and consistency only. Atlas must remain a native PulsePort system. Do not copy external CSS, class names, gradients, or layout code.

## 1. Core Principles

### One visual language across all pages

- Every page must feel like part of the same product family.
- A user should recognize the same structure, density, spacing, card behavior, and action patterns on every surface.
- New page work must start by composing approved Atlas primitives before inventing page-specific treatments.

### Same font scale

- Use one shared type scale across all product surfaces.
- Page titles, section titles, metric values, labels, body copy, and helper text must use the same size ladder everywhere.
- Numeric values must not be manually resized per page unless the design system explicitly allows that size.

### Same spacing scale

- Page padding, section gaps, card gaps, and card padding must come from one shared spacing system.
- Do not “eyeball” spacing per page.
- Any spacing exception must be documented before implementation.

### Same card rules

- Cards must share border radius, border treatment, surface fill, and internal padding logic.
- Atlas pages should not invent “special” boxes for one page unless that box becomes a named shared primitive.

### Same grid rules

- Analytics surfaces must use consistent column counts, responsive breakpoints, and stacking rules.
- Each page may vary content, but not the underlying layout grammar.

### Same button and action rules

- Primary actions, secondary actions, ghost actions, inline actions, and rail actions must behave consistently.
- Buttons should communicate intent through placement and hierarchy, not random decoration.

### Same dark and light behavior

- Dark and light themes must follow the same hierarchy and contrast rules.
- Light mode is not a recolored afterthought. It must preserve balance, readability, and emphasis.

## 2. Layout Primitives

### Page shell

- Shared top-level content wrapper for every major view.
- Defines width constraints, horizontal padding, vertical breathing room, and section rhythm.
- Must prevent pages from feeling either overly cramped or randomly stretched.

### Page header

- Contains page title, optional subtitle, and optional top-level actions.
- Title and subtitle alignment must match across all analytics pages.
- Header action placement must be predictable and not float loosely.

### Metric strip

- Top-of-page summary area for the most important decision metrics only.
- This is not a dumping ground for every available stat.
- Metrics shown here must answer: “What matters most right now?”

### Feature grid

- Secondary summary row for supportive insights such as best performer, worst performer, dominant position, risk, or coverage.
- Cards in this row must be symmetrical and aligned.

### Main content panel

- Primary data surface below the summary area.
- Used for holdings, positions, performance breakdowns, or detailed analytics modules.

### Side action rail

- Shared region for next actions such as Review Transactions, Inspect Wallets, Open Planner, or Open Token Page.
- On smaller screens, the rail stacks below the main summary and remains clearly grouped.

### Holdings and table card

- Standard analytics table/list container.
- Must be visually stable, easy to scan, and resistant to text overflow.
- Column logic should be consistent across list-heavy pages.

### Empty, loading, and error states

- Each state must be designed deliberately.
- Empty states must explain what is missing and what the user should do next.
- Loading states must preserve layout shape to avoid jarring shifts.
- Error states must remain compact, readable, and action-oriented.

## 3. Card System

### Metric card

- Small summary card for one high-priority metric.
- Contains:
  - label
  - value
  - short supporting line
- Must not contain excessive explanation or multiple unrelated values.

### Feature card

- Used for meaningful secondary signals such as top holding, best PnL, worst PnL, dominant chain, or coverage quality.
- Must keep one headline insight per card.

### Position card

- Used for top positions or compact per-asset summaries.
- Should always anchor around current value, invested basis, and performance delta when available.

### Action card

- Used for clear navigation or next-step actions.
- Actions must read as product tools, not decorative callouts.

### Warning and status card

- Used for data quality, missing coverage, stale inputs, partial sync, or caution states.
- Must be visually distinct without looking like an error unless it is actually an error.

### Table and list card

- Used for holdings, position lists, transaction-backed rows, and other scan-heavy datasets.
- Must enforce row consistency, padding consistency, and no text spillover.

## 4. Spacing System

### Page padding

- Desktop page content: 24px to 32px horizontal padding.
- Tablet page content: 20px to 24px.
- Mobile page content: 16px.

### Section gap

- Standard gap between major vertical sections: 16px to 24px.
- Large feature transitions may use 24px only if consistent with adjacent sections.

### Card gap

- Standard gap inside multi-card grids: 12px to 16px.
- No arbitrary per-page card spacing.

### Card padding

- Standard internal card padding:
  - compact cards: 16px
  - feature cards: 18px to 20px
  - hero metric cards: 20px to 24px

### Mobile stack rules

- Multi-column summary areas collapse cleanly to one column.
- Action rails move below the summary block.
- Tables may collapse into stacked analytics rows, but spacing and alignment must still follow the same system.

## 5. Typography

### Page title

- Large, high-contrast, stable headline.
- One shared size range across major pages.

### Section title

- Smaller than page title, but clearly stronger than labels and body text.
- Must not compete with the main headline.

### Metric value

- Highest emphasis text in analytics surfaces.
- Used only for important numbers.
- Must be consistent across Dashboard, Portfolio Insights, Wallets, and Transactions.

### Labels

- Small uppercase or compact supporting labels.
- Used for card labels, column labels, and metric labels.
- Must remain legible in both themes.

### Body copy

- Used for supporting sentences, state messaging, and descriptions.
- Keep copy short and functional.

### Numeric and monospace rules

- Monospace may be used for addresses, transaction-like identifiers, or certain numeric contexts.
- Standard large analytics values should not default to monospace unless the system specifically calls for it.

## 6. Visual Hierarchy

Portfolio and analytics pages must prioritize content in this order:

1. total current value
2. invested or remaining cost basis
3. total PnL
4. transaction coverage or trust status
5. top positions or holdings
6. best and worst performance signals
7. next actions

Implications:
- High-value metrics go first.
- Weak filler stats do not belong in the top summary.
- Positions and holdings come below the summary and should be the main body of the page.
- Actions belong in a clear grouped region, not scattered around the layout.

## 7. Implementation Guardrails

- No new random page-specific card styles.
- No one-off spacing adjustments without design-system justification.
- No text overflow inside cards, rows, or action areas.
- No unapproved gradients or glow treatments.
- No page-specific “pretty boxes” that exist only to decorate.
- If a component is missing, document the primitive before creating it.
- Reuse existing Atlas primitives where possible.
- If a page needs a new primitive, the primitive must be named and documented so later pages can share it.

## 8. Rollout Plan

### First apply to Portfolio Insights

- Use this page to prove the contract on a transaction-backed analytics surface.
- Priority: useful metrics, balanced summary, clean positions list, clear actions.

### Then Dashboard

- Align the top summary, feature cards, allocation section, and decision support actions to the same system.

### Then Wallets

- Ensure holdings, wallet-level summaries, calculator surfaces, and filters follow the same spacing and card rules.

### Then Transactions

- Apply the same summary strip, action grouping, and list/table consistency rules.

### Then token pages and modals

- Token detail surfaces and modals must inherit the same header, card, and typography system.

## Recommended Working Method

- Design first at the contract level.
- Then implement one page at a time.
- After each page, verify:
  - hierarchy is correct
  - spacing matches the system
  - cards share the same rules
  - actions are grouped consistently
  - dark and light mode both still hold up

## First Implementation PR

Recommended first implementation PR:
- `Portfolio Insights Atlas system alignment`

Scope:
- replace weak top summary cards with a useful metric strip
- align secondary cards to one shared feature-card pattern
- move the positions surface into a clean analytics list/table card
- keep all existing transaction-backed calculations intact
- avoid any routing, pricing, or backend changes
