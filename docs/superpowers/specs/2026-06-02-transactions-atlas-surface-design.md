# Transactions Atlas Surface Design

Date: 2026-06-02
Status: proposed
Project: Pulseport portfolio tracker

## Goal

Make `Transactions` the next dedicated Atlas product surface after the Wallets extraction.

This slice should:

- move the transaction experience out of the feeling of "leftover module inside App"
- preserve the current ledger depth, exact-asset fidelity, and existing filters
- make the page easier to scan and understand for normal portfolio users
- keep the path between `Wallets` and `Transactions` obvious and consistent

The page should feel like part of the same product family as the Atlas Wallets surface, not a separate utility screen.

## Scope

This slice covers the `Transactions` page only.

It includes:

- the page header and section hierarchy
- the main transaction module shell
- filter layout and active-filter visibility
- summary strips and drill-down affordances
- clearer relationship between ledger rows and current holdings context
- Atlas treatment of the transaction surface

It does not include:

- a new transaction normalization engine
- a backend rewrite of transaction truth
- a Wallets redesign
- a dashboard redesign
- bridge or DeFi-specific redesign outside the transaction page itself

## Product Direction

The `Transactions` page should answer:

- what happened
- on which chain
- which exact asset moved in or out
- what it was worth at the time
- what it means in the context of the current portfolio
- where I should click to go deeper

The user should not have to decode the page. The structure should explain itself.

## Information Architecture

The page should be organized in this order:

1. Page header / purpose
2. Transaction module summary row
3. Filters and active filter chips
4. Main transaction list
5. Token-specific drill-down or contextual side module when filtered
6. Secondary analytics blocks like PLS flow or received-assets context

The page should avoid the feeling of many stacked unrelated controls.

## Atlas Theme Application

Atlas treatment should be applied to:

- the main transaction shell
- filter bars
- summary chips
- grouped transaction panels
- token-filter context blocks

Atlas application here means:

- high-contrast surfaces
- restrained accent usage
- clearer section borders
- less visual noise between primary and secondary controls
- consistent typography with Wallets and the shell

## Interaction Rules

The page must preserve strong drill-down behavior:

- clicking from Wallets into Transactions should land users in the correct context
- asset filters must remain visible and removable
- transaction rows/cards must keep their explorer and token-context affordances
- compact mode and "view as you" should remain understandable toggles

No important control should look decorative only.

## Data Rules

This slice is still presentation-first.

That means:

- preserve current normalized transaction data flow
- do not add new accounting logic in the UI
- keep exact-asset identity intact
- do not silently collapse bridge/fork variants into shared token families

If the page needs new summary text or shallow derived metrics, derive them from already available transaction inputs.

## Relationship To Other Open Work

This slice comes after the first Wallets migration and before the next dashboard polish.

That means:

- `Wallets` remains the source of entry into transaction context
- a small Wallets follow-up may still happen in parallel, especially replacing duplicated asset presentation with top-4 featured holdings
- dashboard polish should wait until Transactions has the same Atlas clarity as Wallets

## Success Criteria

This slice is successful when:

- the page looks clearly Atlas-aligned
- a Wallets user can move into Transactions without context loss
- the page is easier to scan than the current version
- existing transaction depth is preserved
- no new frontend truth logic is introduced
