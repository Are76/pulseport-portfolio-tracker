# PulsePort Data Trust Page (Launch Draft)

## What PulsePort tracks

PulsePort tracks read-only wallet data for PulseChain, Ethereum, and Base.
No private keys are requested, stored, or transmitted.

## Data sources and confidence model

PulsePort combines multiple sources and prioritizes on-chain data where possible:

1. **On-chain RPC calls** (highest confidence for balances/reserves/state).
2. **Explorer APIs** (transaction indexing and historical pagination).
3. **Market data APIs** (price enrichment and market metadata).

When one source fails, PulsePort falls back to alternative endpoints where available.

## Update behavior

- Portfolio state refreshes on user demand and scheduled sync points.
- Some analytics and market fields may lag due to third-party API latency.
- Network/API outages may temporarily reduce data completeness.

## Known limitations

- Bridged assets can diverge from canonical token peg assumptions.
- Third-party API outages can affect non-critical enrichment fields.
- Historical cost-basis quality depends on available transaction history.

## Security model

- Wallets are read-only addresses.
- No signing, trading, or key custody is performed by PulsePort.
- App state is cached locally for performance.

## Before you act on data

- Verify token contracts for critical transactions.
- Double-check bridge route, destination chain, and token variant.
- Treat dashboard values as decision support, not financial advice.
