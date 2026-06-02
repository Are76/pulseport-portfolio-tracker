# Atlas Next Slices Roadmap

**Date:** 2026-06-02  
**Canonical repo:** `pulseport-portfolio-tracker`  
**Current state:** `Wallets` Atlas surface is merged to `master`

## Goal

Take Pulseport from "mixed prototype plus migrated pieces" to a coherent Atlas product with:

- a consistent shell and visual language
- clear page ownership
- less duplicate information
- better click-through logic
- stronger alignment between UI surfaces and backend truth direction

## Working Principle

We continue side by side, surface by surface.

That means:

- one bounded branch at a time
- one primary page goal per slice
- small UI-only follow-ups are allowed when they reduce confusion
- no broad rewrite branches

## Recommended Next Order

### 1. Wallets follow-up polish

**Branch type:** Atlas UI / UX  
**Estimated size:** small

Focus:

- make the 4 highlighted asset cards represent the top holdings by value
- remove those same assets from the list immediately below to avoid duplicate presentation
- preserve wallet scope and chain scope behavior

Why this comes first:

- it is small
- the user already identified the duplication problem
- it improves the page that was just merged without reopening the whole Wallets slice

### 2. Transactions Atlas surface

**Branch type:** Product Surface Migration  
**Estimated size:** medium

Focus:

- dedicated Atlas transaction page structure
- clearer filter hierarchy
- better ledger readability
- preserved Wallets -> Transactions handoff
- preserved exact-asset identity

Reference spec:

- `docs/superpowers/specs/2026-06-02-transactions-atlas-surface-design.md`

Why this is next:

- Wallets already routes users here
- the two pages should feel like one system
- this is the next most important trust surface after Wallets

### 3. Dashboard follow-up polish

**Branch type:** Atlas UI / UX  
**Estimated size:** medium

Focus:

- reduce leftover visual inconsistency
- improve hierarchy and scanning
- align dashboard boxes with what we now learned from Wallets and Transactions
- keep the home page compact, readable, and less repetitive

Why this comes after Transactions:

- the dashboard should reflect the page system, not lead it blindly
- once Wallets and Transactions are aligned, dashboard polish becomes easier and less guessy

### 4. Token detail / product page

**Branch type:** Product Surface Migration  
**Estimated size:** medium

Focus:

- stronger detail context
- better facts/actions split
- cleaner relationship between holdings, transactions, and token intelligence

### 5. HEX Stakes

**Branch type:** Product Surface Migration  
**Estimated size:** medium

Focus:

- bring stake data and summaries into the same Atlas surface model
- preserve yield, maturity, and position logic

### 6. Bridges

**Branch type:** Product Surface Migration  
**Estimated size:** medium

Focus:

- make bridge activity feel operational, not bolted on
- preserve received-assets and route context

### 7. DeFi / LP

**Branch type:** Product Surface Migration  
**Estimated size:** larger

Focus:

- Atlas treatment for LP, farm, and allocation-style surfaces
- better clarity around regular LP vs farm LP vs wallet LP

## Product Target

At the end of this phase, Pulseport should feel like:

- a premium PulseChain-native portfolio intelligence product
- less like a generic exchange clone
- easier to scan and easier to trust
- deep enough for serious community users without becoming text-heavy or confusing

## Done Looks Like

We are on the right track when these statements become true:

- users understand where to click without guessing
- page sections do not repeat the same information in multiple forms without purpose
- Wallets, Transactions, Dashboard, and token detail feel like one product family
- data-heavy pages are easier to read than the old versions
- backend-truth migration can continue without fighting the UI
