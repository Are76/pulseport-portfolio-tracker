# Dashboard Atlas Polish Design

Date: 2026-06-03
Status: proposed
Project: Pulseport portfolio tracker

## Goal

Make the `Dashboard` feel like the same mature Atlas product family as the merged `Wallets` and `Transactions` surfaces.

This slice should:

- improve scanning and hierarchy first
- remove weak or low-value dashboard boxes
- introduce more useful visual anchors
- make primary actions easier to find
- preserve the compact, premium, dark-first Atlas direction
- avoid turning the dashboard into a noisy control wall

The result should feel calmer, more informative, and more obviously navigable than the current dashboard.

## Scope

This slice covers the dashboard surface only.

It includes:

- dashboard hero / snapshot layout
- dashboard metric tile ordering
- live prices section with token logos
- signals section redesign
- allocation visualization redesign
- placement of planner / transaction / insight actions
- a simpler and more relevant allocation calculator / rebalance tool
- removal or demotion of weak dashboard boxes
- a targeted `PCOCK` classification/display fix if the current dashboard treats it like spam or zero-value noise

It does not include:

- a CoinPulse-style backend PnL migration
- a new pricing engine
- a full token classification system rewrite
- a Wallets redesign
- a Transactions redesign
- a HEX Stakes redesign

## Product Direction

The dashboard should answer these questions quickly:

- what is my portfolio worth right now
- what changed in the selected range
- which holdings matter most
- what should I look at next
- what actions are available from here

It should not make the user decode vague boxes like `Noise` or `Hidden` before they can understand the real state of the portfolio.

The dashboard should feel like a portfolio intelligence surface, not a generic exchange clone and not a debug page.

## Core Decisions

### 1. Remove `Hidden / Noise` as primary dashboard metrics

These boxes are not useful enough to justify prime placement in the dashboard hero area.

They should either:

- be removed from the primary dashboard metric row entirely, or
- be demoted into secondary maintenance context where they do not compete with actual portfolio information

The main dashboard must prioritize:

- portfolio value
- range change
- staking / yield context
- LP / DeFi exposure
- top holdings and allocation

### 2. Add a `Live Prices` section with logos

The dashboard should include a compact `Live Prices` section that shows only assets the user actually holds now.

Requirements:

- show the top 6 assets by current portfolio value
- include token logos
- show token symbol, compact chain context, current price, and change
- support click-through into the token detail / product flow
- stay compact and scannable

This is the preferred replacement for weak generic metric boxes because it gives the dashboard a more legible "market surface" without becoming a watchlist app.

### 3. Group `Transactions`, `Calculator`, `Exit plan`, and `Portfolio insights`

These should be treated as a coherent action cluster instead of feeling scattered across the dashboard.

They belong in a dedicated secondary rail or action block that reads as:

- portfolio insights
- review transactions
- open calculator / allocation planner
- open exit plan / profit planner

This grouping should communicate that these are decision-support tools, not isolated widgets.

### 3a. Reframe `Calculator` as a rebalance tool

The current calculator is too hard to understand and does not feel relevant enough from the dashboard.

In this slice it should become a simple rebalance planner:

- the user enters target allocation percentages per visible asset
- if the entered total is not exactly `100%`, the tool auto-normalizes the target mix
- the UI clearly shows current mix vs target mix vs gap
- the tool explains the best path to the target in plain language

The output should not stop at percentages. It should tell the user what to do.

Examples of the intended output style:

- `Reduce HEX by about 4.2%`
- `Swap about 145,000 PLS to buy the needed INC`
- `You already match the target closely`

For the first version, rebalance guidance should assume that execution happens through `PLS` as the intermediate asset when concrete swap guidance is shown.

That means the calculator is not a generic math utility. It is a portfolio allocation helper connected to the actual PulseChain use case.

### 4. Replace the current allocation graphic

The current allocation bar is too thin and too limited as a dashboard centerpiece.

The new allocation graphic should:

- feel more product-grade and visual
- communicate composition at a glance
- stay readable in dark mode
- support click-through into relevant holdings or token detail flows

Chosen direction:

- a hybrid "composition + top weights" card

The hybrid should combine:

- a primary composition graphic
- the most important weights listed with labels and values
- obvious relationship to the rebalance helper

The dashboard should not use a purely decorative chart. The graphic must help the user understand composition quickly.

### 5. Redesign `Signals`

Signals should become clearer, shorter, and more visual.

They should move away from looking like generic list rows and become more like compact intelligence cards or structured signal rows with:

- a short signal title
- a clear state or delta
- a one-line explanation
- a visual marker or icon
- an obvious click affordance when deeper context exists

Signals should explain meaningful portfolio state such as:

- top holding concentration
- upcoming stake maturity
- LP or farming exposure
- strong movers
- wallet-specific imbalances

Signals should not feel like filler text.

### 6. Add more visual anchors without making the page heavy

The dashboard needs more graphic structure, but not more clutter.

This means:

- token logos in live-price cards
- stronger visual grouping of primary and secondary modules
- more deliberate card rhythm
- better use of section labels, icons, and compact deltas
- one or two stronger graphical modules instead of many text-dense boxes

The dashboard should remain compact and easy on the eyes.

### 7. Fix `PCOCK` misclassification or zero-value treatment

If `PCOCK` is currently being treated as spam, dust, or a zero-value placeholder in places where it should be visible as a real holding, this slice should include a targeted correction.

That fix should:

- preserve the current data flow where possible
- stay tightly scoped to the actual classification/display issue
- avoid broad asset-taxonomy rewrites inside this dashboard branch

This is included because a dashboard that hides or mislabels real holdings will feel untrustworthy even if the visual design improves.

## Information Architecture

The recommended dashboard order is:

1. Portfolio snapshot hero
2. Primary portfolio metrics
3. Live prices
4. Signals and decision-support cluster
5. Allocation / composition graphic
6. Secondary supporting context

This order is designed to make the page readable in one downward scan instead of forcing the user to inspect many equal-weight boxes.

## Dashboard Structure

### Portfolio snapshot hero

This top area should show:

- total portfolio value
- selected range
- main change for the range
- short supporting context

It should still feel compact, but it must anchor the page more clearly than the current scattered summary treatment.

### Primary metrics row

This row should contain the most useful "status now" signals.

Recommended candidates:

- staking / locked value
- LP / DeFi exposure
- top holding or top concentration
- portfolio change or flow context

This row should not contain `Hidden`, `Noise`, or similar maintenance-only concepts.

### Live prices

This section should show the top held assets by value with logos and market context.

It should feel like:

- a portfolio-native market strip
- personalized to what the user owns
- directly clickable

This section should not become a broad community watchlist in the first iteration.
It is explicitly a top-6 held-assets strip, not a generic market board.

### Signals

Signals should sit near the main scan path, not buried in a corner.

They should visually complement live prices and allocation rather than repeat the same information in sentence form.

### Decision support / quick actions

This section should group:

- transactions
- calculator / allocation planner
- exit or profit planner
- portfolio insights

This block should read as "what can I do next from here?"

The calculator entry inside this group should be named and explained more clearly than it is today.

Preferred direction:

- title or label that implies rebalancing, not abstract calculation
- one-line explanation that this helps the user move from current allocation to target allocation
- obvious relationship to the allocation graphic nearby

### Allocation

Allocation should appear as one of the strongest visual modules on the page.

It should support understanding composition without needing long explanation text.

The allocation section should pair naturally with the rebalance tool, so the user can see:

- current mix
- desired mix
- what needs to move

## Interaction Rules

All major boxes on the dashboard should be clearly one of two things:

- actionable drill-down surfaces
- static summary surfaces

Requirements:

- live-price cards open token detail or holdings context
- signals open the relevant deeper surface when possible
- quick actions lead directly to the correct workflow
- allocation should either drill into holdings or filter a more detailed view
- no card with strong emphasis should feel dead

## Data Rules

This slice remains presentation-first with one targeted correctness fix.

That means:

- do not introduce new frontend truth logic for PnL
- do not invent new accounting rules inside dashboard components
- prefer shallow derived presentation state from existing page inputs
- keep any `PCOCK` fix tightly bounded to asset display/classification handling

The dashboard may become more visual, but it should not become less trustworthy.

The rebalance helper may derive shallow presentation math from already visible holdings and prices, but it must not introduce a second hidden source of truth for portfolio accounting.

## Relationship To Other Open Work

This slice comes after merged `Wallets` and `Transactions`.

That means:

- it should borrow proven visual ideas from those surfaces
- it should strengthen the click paths into Wallets, Transactions, and token detail
- it should avoid swallowing later PnL-truth migration work
- it should leave room for a later backend-aligned `Dashboard data clarity` or `PnL truth alignment` slice

## Success Criteria

This slice is successful when:

- the dashboard is easier to scan than the current version
- `Hidden / Noise` no longer dominates prime real estate
- live-price cards with logos make the dashboard feel more alive and useful
- `Calculator`, `Exit plan`, `Transactions`, and `Portfolio insights` read as a coherent action cluster
- the allocation calculator now feels understandable and relevant
- the rebalance helper can explain a practical path toward the target mix
- allocation is more graphical and more informative
- signals are clearer, shorter, and more useful
- `PCOCK` is not incorrectly buried as spam or rendered as a meaningless zero when it should be visible
- the dashboard feels like the same product family as the merged Wallets and Transactions surfaces
