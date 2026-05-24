# # PulsePort Portfolio Tracker

A multi-chain portfolio dashboard with strong focus on **PulseChain** and PulseX.

## Features
- Wallet connection (MetaMask, WalletConnect, etc.)
- Real-time token balances & portfolio overview
- Intelligent spam/junk token filtering for PulseChain
- Price tracking and basic PnL calculations
- Responsive web + Electron desktop app

## Tech Stack
- Vite + React + TypeScript
- Electron
- viem / wagmi for blockchain interactions
- Tailwind CSS + shadcn/ui
- Reusable PulseChain spam filter
- Integrated reusable PulseChain spam filter

See: `src/lib/spam-filter/integration.ts` for usage examples.

##Live demo##
https://pulseportcodex.vercel.app/

## Setup & Installation

1. Clone the repository
   ```bash
   git clone https://github.com/Are76/pulseport-portfolio-tracker.git
   cd pulseport-portfolio-tracker
   ```
2. Add the spam filter submodule:
   ```bash
   git submodule add https://github.com/Are76/pulsechain-spam-filter.git packages/pulsechain-spam-filter
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start development server:
   ```bash
   npm run dev
   ```
## Build
```bash
npm run build
```