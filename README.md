# PulsePort Portfolio Tracker

A multi-chain portfolio dashboard with strong focus on **PulseChain** and PulseX.

## Features
- Wallet connection (MetaMask, WalletConnect, etc.)
- Real-time token balances & portfolio overview
- Intelligent spam/junk token filtering
- Price tracking and basic PnL
- Responsive design (web + Electron desktop)

## Tech Stack
- Vite + React + TypeScript
- Electron
- viem/wagmi for blockchain
- Tailwind + shadcn/ui

## Spam Filter Integration

Integrated reusable PulseChain spam filter from:  
[https://github.com/Are76/pulsechain-spam-filter](https://github.com/Are76/pulsechain-spam-filter)

See: `src/lib/spam-filter/integration.ts`

## Setup & Installation

1. Clone repository
2. Add submodule:
   ```bash
   git submodule add https://github.com/Are76/pulsechain-spam-filter.git packages/pulsechain-spam-filter
3.  npm install
4.  npm run dev