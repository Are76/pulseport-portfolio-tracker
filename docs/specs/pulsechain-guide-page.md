# Spec: PulseChain Guide / Info Page with FAQ

**Status:** Draft
**Date:** 2026-04-19
**Owner:** PulsePort
**Related files:** [src/components/PulseChainOfficialPage.tsx](../../src/components/PulseChainOfficialPage.tsx), [src/components/PulseChainCommunityPage.tsx](../../src/components/PulseChainCommunityPage.tsx), [src/App.tsx](../../src/App.tsx)

---

## 1. Goal

Deliver a single, authoritative **PulseChain Guide** page inside the app that answers "what is this chain, what can I do on it, who built it, and where do I go next?" — synthesised from:

- https://pulsecoinlist.com/map (ecosystem map by category)
- https://plsfolio.com/ecosystem (curated ecosystem view)
- https://www.pulsechainstats.com/richardheart/ (founder bio)
- https://www.pulsechainstats.com/ecosystem (ecosystem + live stats)

Two pages already exist (`PulseChainOfficialPage`, `PulseChainCommunityPage`). This spec consolidates scope so they read as a coherent guide, adds missing content, and wires a comprehensive FAQ.

## 2. Non-goals

- No new routing structure; keep existing `pulsechain` and `ecosystem` tabs.
- No live on-chain queries beyond what already ships (network stats cards stay static/semi-static).
- No editorial content about price predictions or investment advice.

## 3. Information architecture

Keep the **two-page split**, but with clear separation:

### 3a. `PulseChainOfficialPage` — "The Chain"
Covers the protocol, the founder, the native tokens, and official infrastructure.

Sections (in order):
1. **Hero** — title "PulseChain", stat boxes: Chain ID 369, Native PLS, ~10s blocks, PoS, Forked from Ethereum, Launched 2023.
2. **What is PulseChain** — plain-English explainer; Ethereum hard fork, same EVM, separate state, ~12× cheaper gas.
3. **Add to Wallet** — copy buttons for RPC, chain ID, symbol, explorer URL (already present — keep).
4. **Core Tokens** — PLS, WPLS, PLSX, pHEX, INC, PRVX with addresses (already present — keep).
5. **Bridged Tokens** — eHEX, pDAI, pUSDC, pUSDT, pWETH, pWBTC with the **"price is NOT $1"** caveat for stables.
6. **Richard Heart** — expanded bio (see §5).
7. **Official Projects** — PulseChain Bridge, PulseX, HEX.com, PulseChain Explorer, PumpTires.
8. **Run a Node / Validator** — existing content.
9. **IPFS Apps** — existing content.
10. **FAQ** — protocol-level questions (see §6a).

### 3b. `PulseChainCommunityPage` — "The Ecosystem"
Covers third-party apps, tools, and the wider community.

Sections (in order):
1. **Hero** — existing.
2. **Essential Tools** — PulseX, LibertySwap, ProveX, LASO Finance, Peer.xyz (already added — keep).
3. **DEXs** — PulseX, PHUX, 9mm, 9inch, Piteas, PulseSwap, Omnis, EazySwap, GoPulseX, PortalX, RichardSwap.
4. **DeFi / Lending** — LiquidLoans (PLS), INCprinter (INC), FLEX (HEX), EARN (PLSX), PHIAT, Hedron, Icosa, Maximus family, POWERCITY, Liquid Loans, PulseDAO.
5. **Bridges** — Official PulseChain Bridge, Hyperlane, Liberty Swap, BlockBlend, ChangeNOW, Rubic, Simple Swap, StealthEX, TokensEx, Gibs Finance.
6. **Analytics & Portfolio** — PulsePort (self), DexScreener, DexCheck, DeFi Llama, DeBank, Phatty, LookIntoHex, AppHex.Win, PulseCoinList, pulsechainstats.com, plsfolio.com, Koinly.
7. **Wallets** — Tangem, Rabby, Internet Money, The Pulse Wallet, MetaMask (config).
8. **On/Off Ramps** — Guardarian, 0xCoast, Internet Money, NOWPayments.
9. **NFTs** — Mintra, PulseMarket, BeatBox, TesseractX.
10. **Web3 Identity** — PNS / Pulse Domains, pls.fyi, pls.to.
11. **Developer Tools** — PulseChain RPC, NOWnodes, Fetch Oracle, Moralis, VerifyPLS, OtterScan, Token Lists.
12. **Community & Socials** — Telegram, X, Discord links (existing).
13. **FAQ** — ecosystem-level questions (see §6b).

## 4. Visual design

Reuse the existing hero + `Section` + `StatBox` pattern already established in both pages. No new design system. Each ecosystem subsection uses its existing accent color (DEXs pink, DeFi orange, Bridges purple, Analytics green, Wallets blue, On-Ramps amber).

Each project card:
- Name (bold)
- One-line description (≤ 90 chars)
- Category tag
- External link icon

## 5. Richard Heart section (expanded)

Replace current minimal bio with a short, neutral profile block:

- **Who:** Richard James Schueler, founder of HEX (2019), PulseChain (2023), and PulseX (2023).
- **Mission:** self-custody, transparency, financial education.
- **Milestones:** raised $27M+ for medical research; launched one of the largest free airdrops in crypto history; SEC case dismissed in 2025 without settlement.
- **Philosophy quote block:** one pulled quote on self-custody / decentralisation.
- **Links:** richardheart.com, X profile, HEX.com, PulseChain.com.

Tone: factual, no hype. No price claims.

## 6. FAQ content

### 6a. Protocol FAQ (on `PulseChainOfficialPage`)

1. What is PulseChain?
2. How is PulseChain different from Ethereum?
3. Why does my Ethereum address have a balance on PulseChain?
4. What is PLS? How is it different from ETH?
5. What is the difference between pHEX and eHEX?
6. Are pDAI / pUSDC / pUSDT worth $1?
7. How do I add PulseChain to MetaMask?
8. Which RPC should I use?
9. What block explorer should I use?
10. Is PulseChain a Layer 2?
11. Who runs PulseChain validators?
12. When did PulseChain launch?
13. Where do I buy PLS?
14. Is PulseChain safe / audited?

### 6b. Ecosystem FAQ (on `PulseChainCommunityPage`)

1. What is the official DEX on PulseChain?
2. How do I bridge assets to PulseChain?
3. What is the difference between the official bridge, Liberty Swap, and Hyperlane?
4. Can I buy PLS with fiat directly?
5. Where can I track my PulseChain portfolio?
6. What wallets support PulseChain?
7. Are there NFT marketplaces on PulseChain?
8. How do I stake HEX on PulseChain?
9. What is farming on PulseX?
10. How do I revoke token approvals?
11. What is PulseChain Leagues (Shrimp → Poseidon)?
12. Where can I find the full ecosystem map?

Each answer: 1–3 sentences, with a link where relevant. Reuse existing `FaqItem` component.

## 7. Data model

No new types. FAQ entries continue as:

```ts
type FaqItem = { q: string; a: string; link?: { href: string; label: string } };
```

(The current type omits `link`; add it as optional to support inline CTAs.)

## 8. Acceptance criteria

- Both pages render with all sections listed in §3 without layout regressions.
- Every project card links to the correct external URL and opens in new tab (`rel="noopener noreferrer"`).
- FAQ covers all questions in §6; each answer is ≤ 3 sentences.
- Stablecoin caveat ("price is NOT $1") is visible on the Bridged Tokens section **and** in FAQ 6a.6.
- No duplicated content between the two pages (e.g. PulseX appears as "official" on chain page, as "essential tool" on ecosystem page — separate framings, not duplicated copy).
- Lighthouse accessibility ≥ 90 on both pages.

## 9. Out-of-scope follow-ups

- Live ecosystem directory fetched from a maintained JSON feed (pulsecoinlist has one; TBD).
- Per-project live TVL badges.
- Search / filter within the ecosystem page.
- i18n.
