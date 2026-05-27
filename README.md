# PulsePort Portfolio Tracker

A multi-chain portfolio dashboard with strong focus on **PulseChain** and PulseX.

**Live demo:** https://pulseportcodex.vercel.app/

## Runtime Support

PulsePort/CoinPulse is currently a **web-first application**.

Supported runtime:
- Web app (Vite + React deployment)

Legacy / unsupported runtime for this phase:
- Packaged Electron desktop distribution

Electron runtime files remain in the repository as legacy infrastructure only.
Electron desktop packaging scripts have been quarantined to avoid implying active support.

If Electron desktop support returns later:
- API access should move behind a secure preload/main-process bridge or trusted proxy.
- Chromium `webSecurity` should remain enabled.
- `webSecurity` must not be disabled to bypass CORS.

## Features

- Wallet connection (MetaMask, WalletConnect, etc.)
- Real-time token balances & portfolio overview
- Intelligent spam/junk token filtering for PulseChain
- Price tracking and basic PnL calculations
- Responsive web dashboard

## Tech Stack

- Vite + React + TypeScript
- Electron (legacy/quarantined runtime)
- viem for blockchain interactions
- Tailwind CSS
- Reusable PulseChain spam filter

## Spam Filter Integration

Integrates a reusable PulseChain spam filter to automatically hide spam tokens.

See: `src/lib/spam-filter/integration.ts` for usage examples.

## Setup & Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Are76/pulseport-portfolio-tracker.git
   cd pulseport-portfolio-tracker
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start development server:
   ```bash
   npm run dev
   ```

## Build

```bash
npm run build
```

---

*Last updated: May 2026*


## Repository Health Baseline (Post-Health Sequence)

Baseline verification date: **2026-05-27 (UTC)**.

Verified on branch from current `master` baseline after repo-health PR sequence:
- #116 DexScreener hotfix
- #117 repository health/security cleanup
- #118 Electron desktop runtime quarantine

Checks run:
- `npm run test`
- `npm run lint`
- `npm run build`

Runtime posture confirmed:
- Web-first runtime remains the active supported path.
- Electron remains legacy/quarantined and is not presented as an actively supported runtime.

