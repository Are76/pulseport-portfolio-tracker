# Wallets Atlas Surface Implementation Plan

Date: 2026-06-01
Status: in progress
Branch: `feat/wallets-atlas-surface`
Project: Pulseport portfolio tracker

## Goal

Implement the first Wallets product-surface migration in the canonical tracker repo.

This slice should:

- extract the Wallets surface from the large `App.tsx` branch body into a dedicated page component
- preserve current Wallets functionality
- apply Atlas-aligned styling to the main Wallets surfaces
- preserve Wallets-to-detail and Wallets-to-transactions navigation

## Scope

In scope:

- Wallets page component extraction
- Atlas-styled `All Wallets`, `Coin visibility`, `Assets`, and holdings framing
- explicit combined/per-wallet mode
- transaction handoff preservation
- focused tests for Wallets rendering and interactions

Out of scope:

- backend DTO migration
- Transactions page redesign
- new valuation, pricing, or PnL truth logic

## Implementation Steps

1. Extract Wallets page surface
   - Create a dedicated Wallets page component under `src/pages` or `src/components`
   - Move the `activeTab === 'assets'` UI branch into that component
   - Keep inputs/outputs explicit so `App.tsx` remains the state owner for this slice

2. Apply Atlas surface structure
   - Replace ad hoc section wrappers with a small set of Wallets page sections
   - Align `All Wallets`, `Coin visibility`, and `Assets` surfaces to the current shell/dashboard token system
   - Keep dark/light parity

3. Add explicit combined/per-wallet mode
   - Reuse the stronger `PulsePort` pattern
   - Default to combined mode
   - Preserve wallet grouping and token visibility behavior

4. Preserve navigation and actions
   - Keep token selection opening the correct detail flow
   - Keep Wallets-originated transaction navigation intact
   - Keep add-wallet, hidden/manual coin, and refresh actions intact

5. Add and update focused tests
   - Wallets page render smoke
   - combined/per-wallet mode switching
   - coin visibility panel render/actions
   - detail/transaction handoff preservation where practical

6. Validate
   - run focused tests
   - run `npm.cmd run lint`
   - run `npm.cmd run build`

## Notes

- This branch is intentionally UI-first.
- `App.tsx` may still own state after this slice, but the Wallets surface should no longer live inline as a large page body.
- If a small reusable Wallets helper component naturally emerges, extract it. Avoid abstraction for its own sake.
