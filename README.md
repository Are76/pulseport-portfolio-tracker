# Pulseport — Portfolio Tracker

A desktop portfolio tracker for **PulseChain, Ethereum and Base**. Track balances, HEX stakes, token prices, swap history and trade P&L — all in one place.

## Features

- **Multi-chain support** — PulseChain, Ethereum and Base in one dashboard
- **Live token prices** — PLS, PLSX, HEX, INC, PRVX, eHEX, ETH, USDC and more
- **HEX stakes** — view all active stakes with T-shares, progress and estimated value
- **Trade P&L** — realized profit/loss calculated from on-chain swap history
- **Transaction history** — filter by chain, asset and type (received / sent / swaps)
- **Portfolio performance chart** — track your total value over time
- **Multiple wallets** — add and label as many wallets as you like
- **No account required** — all data is fetched directly from public blockchain APIs

## Download

Go to [Releases](../../releases/latest) and download for your platform:

| Platform | File |
|----------|------|
| Windows (installer) | `Pulseport Setup x.x.x.exe` |
| Windows (portable) | `Pulseport x.x.x.exe` |
| macOS (Intel + Apple Silicon) | `Pulseport-x.x.x.dmg` |
| Linux | `Pulseport-x.x.x.AppImage` or `.deb` |

## Run from source

**Prerequisites:** Node.js 20+

```bash
git clone https://github.com/Are76/pulseport-portfolio-tracker.git
cd pulseport-portfolio-tracker
npm install
npm run dev
```

Open http://localhost:5174 in your browser.

### Desktop app (Electron)

```bash
# Run in Electron
npm run electron:dev

# Build installer for your platform
npm run electron:build        # Windows
npm run electron:build:mac    # macOS
npm run electron:build:linux  # Linux
```

## API Keys

For Ethereum and Base transaction history you need free API keys from:
- **Etherscan** — https://etherscan.io/apis (Ethereum)
- **Basescan** — https://basescan.org/apis (Base)

Add them via the **API Key** button in the app. PulseChain data requires no key.

## Tech Stack

- React 19 + TypeScript
- Vite + Tailwind CSS v4
- Electron 41
- Recharts (charts)
- Viem (blockchain calls)
- PulseChain Blockscout API
- Etherscan-compatible APIs

## Privacy

No data leaves your machine except direct calls to public blockchain APIs. No analytics, no tracking, no backend.
