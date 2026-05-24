# PulsePort Portfolio Tracker

A multi-chain portfolio dashboard with strong focus on **PulseChain** and PulseX.

**Live demo:** https://pulseportcodex.vercel.app/

## Features

- Wallet connection (MetaMask, WalletConnect, etc.)
- Real-time token balances & portfolio overview
- Intelligent spam/junk token filtering for PulseChain
- Price tracking and basic PnL calculations
- Responsive web + Electron desktop app

## Tech Stack

- Vite + React + TypeScript
- Electron
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
