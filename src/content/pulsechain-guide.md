# PulseChain Guide & Information

## What is PulseChain?

PulseChain (chain ID: 369) is a full Ethereum hard fork launched in 2023. When it launched, it copied the entire Ethereum state — every wallet, token, and smart contract — at a specific block. This means every Ethereum address automatically had the same balances on PulseChain as on Ethereum at that moment.

Key facts:
- EVM-compatible: same address format, same tooling as Ethereum
- Native gas token is **PLS** (not ETH)
- Block time: ~10 seconds
- Launched the largest free cryptocurrency airdrop in history
- Lower fees than Ethereum

PulseChain is **not** Ethereum. Tokens on PulseChain are separate assets with separate prices. A token at the same contract address on both chains has independent markets.

---

## Core Tokens

| Token | Role | Notes |
|-------|------|-------|
| **PLS** | Native gas token | Used to pay transaction fees |
| **WPLS** | Wrapped PLS | ERC20 version of PLS for DeFi use |
| **PLSX** | PulseX DEX token | Buy-and-burn mechanism |
| **HEX** | Staking protocol | Time-locked yield rewards, T-share system |
| **INC** | Farm incentive token | Earned via PulseX liquidity farming |

### Bridged vs Fork-Copied Tokens

When Ethereum was forked, all ERC20 tokens were copied to PulseChain at the same contract addresses — these are called **PRC20 fork copies** (e.g., pHEX at `0x2b591e...`).

When users move tokens from Ethereum via the bridge, new wrapped tokens are minted at **different** addresses — these are **bridged tokens** (e.g., eHEX at `0x57fd0a...`).

| Type | Example | Key Note |
|------|---------|----------|
| PRC20 native | WPLS, PLSX, INC | Created on PulseChain only |
| PRC20 fork copy | pHEX | Copied from ETH at fork block |
| Bridged from ETH | eHEX | Wrapped ETH token; cannot stake in pHEX staking |
| Bridged stablecoin | pDAI, pUSDC, pUSDT | Price is **not** $1.00 — always check live price |

---

## Who is Richard Heart?

Richard Heart (born Richard James Schueler) is the founder of PulseChain, HEX, and PulseX. He is an entrepreneur who overcame poverty in his early years and built multiple blockchain projects aimed at decentralized finance.

**Notable achievements:**
- Founded HEX.com — a blockchain certificate of deposit with a time-lock staking system
- Founded PulseChain — a high-performance Ethereum fork with lower fees
- Founded PulseX — PulseChain's primary decentralized exchange
- Raised over $27 million for medical research
- Accurately predicted Bitcoin market peaks in 2017 and 2021
- Warned early about the failures of Celsius, BlockFi, and FTX
- First crypto founder to win a complete SEC court dismissal without settlement (2025)
- Purchased the Enigma Diamond (555.55 carats), rebranded as The HEX.com Diamond
- Author of *SciVive*, a self-help book on personal growth and health

Richard Heart's stated mission is empowering people through blockchain technology to achieve financial freedom and challenge centralized financial systems.

---

## The Ecosystem

### Decentralized Exchanges (DEXs)

| Project | Description |
|---------|-------------|
| **PulseX V1 / V2** | Official DEX; primary liquidity hub on PulseChain |
| **9INCH / 9MM V3** | Uniswap V3-style concentrated liquidity DEX |
| **PHUX** | Balancer fork on PulseChain |
| **Tide** | Another Balancer fork |
| **EazySwap** | Alternative DEX |
| **RichardSwap** | Community DEX |
| **GoPulseX** | DEX aggregator/frontend |

### DeFi Protocols

| Project | Description |
|---------|-------------|
| **Liquid Loans** | Decentralized lending protocol on PulseChain |
| **PHIAT** | AAVE fork; lending and borrowing |
| **INCprinter** | Lending/borrowing protocol |
| **FLEX Protocol** | DeFi protocol |
| **EARN Protocol** | Yield protocol |
| **Vouch** | Liquid staking |
| **Phame** | GMX fork; perpetuals trading |
| **Hedron** | HEX stake encapsulation; tokenizes HEX stakes |
| **Maximus** | HEX staking pool (variants: Base, Deci, Lucky, Perpetuals, Poly, Pool Party, Trio) |

### Bridges & Cross-Chain

| Project | Description |
|---------|-------------|
| **Official PulseChain Bridge** | Primary ETH ↔ PulseChain bridge |
| **Hyperlane** | Connects 160+ blockchains |
| **BlockBlend** | Privacy bridge |
| **Gibs Finance** | Privacy bridge |
| **TokensEx** | BSC connection |
| **Liberty Swap** | Cross-chain swap |
| **PortalX / StealthEX / SimpleSwap** | Additional bridging options |

### On/Off Ramps

| Project | Description |
|---------|-------------|
| **0xCoast** | Direct fiat on/off ramp via CST stablecoin |
| **Guardarian** | Fiat-to-crypto conversion |

### Wallets

| Wallet | Description |
|--------|-------------|
| **Rabby Wallet** | Multi-chain wallet with PulseChain support |
| **The Pulse Wallet** | PulseChain-native wallet |
| **Tangem** | Hardware wallet supporting PulseChain |
| **MetaMask** | Widely used; add PulseChain as custom network |

### Analytics & Data

| Tool | Description |
|------|-------------|
| **DexScreener** | DEX price charts and pair analytics |
| **DeFi Llama** | TVL and protocol analytics |
| **PulseChainStats** | On-chain stats, ecosystem data, validator info |
| **DeBank** | Portfolio tracker (multi-chain) |
| **Dextools** | Token analytics and charts |
| **Koinly** | Crypto tax and portfolio tracking |
| **Fetch Oracle** | On-chain price oracle |

### NFTs & Gaming

| Project | Description |
|---------|-------------|
| **Mintra** | Primary NFT marketplace on PulseChain |
| **BeatBox** | NFT marketplace |
| **PulseMarket** | NFT trading platform |
| **PulseCats** | Popular NFT collection |
| **Pulse Punks** | PulseChain-native NFT collection |
| **Rentomania** | Blockchain-based game |

### Infrastructure & Developer Tools

| Tool | Description |
|------|-------------|
| **Moralis** | Web3 development platform with PulseChain support |
| **NOWnodes** | RPC node provider for PulseChain |
| **PumpTires** | Memecoin launchpad with fee-burning model |
| **Pulse Domains (.pls)** | Web3 identity / ENS-style naming service |
| **pls.fyi / pls.to** | Domain shortening services |

### Community & Education

| Resource | Description |
|----------|-------------|
| **HowToPulse** | Educational content for new users |
| **PulseTV** | Video content and community streams |
| **PulseConference** | Ecosystem events and conferences |
| **PulseCoinList** | Comprehensive ecosystem directory |

---

## Network Details

| Setting | Value |
|---------|-------|
| Network Name | PulseChain |
| Chain ID | 369 |
| Native Token | PLS |
| Block Time | ~10 seconds |
| RPC (Primary) | https://rpc-pulsechain.g4mm4.io |
| RPC (Backup) | https://pulsechain.publicnode.com |
| Explorer | https://scan.pulsechain.com |

To add PulseChain to MetaMask: Settings → Networks → Add Network → enter the details above.

---

## FAQ

### What is the difference between PLS and ETH?

PLS is the native gas token of PulseChain, similar to how ETH is used on Ethereum. PulseChain forked from Ethereum, so it uses the same address format and tooling, but PLS and ETH are completely separate assets with independent prices.

### Do I need PLS to use PulseChain?

Yes. You need a small amount of PLS in your wallet to pay for transaction fees (gas) on PulseChain. Gas fees on PulseChain are much lower than Ethereum.

### Is my Ethereum wallet address valid on PulseChain?

Yes. Because PulseChain forked Ethereum's state, every Ethereum address exists on PulseChain. You can use the exact same wallet address and private key on both chains. Just switch your wallet to the PulseChain network (chain ID 369).

### What happened to my tokens when PulseChain launched?

When PulseChain forked Ethereum, every token balance was copied. If you held 100 HEX on Ethereum, you also received 100 pHEX on PulseChain at the same address — for free. These are separate tokens on different chains with independent prices.

### What is the difference between pHEX and eHEX?

- **pHEX** (`0x2b591e...`) — The fork copy of HEX that was on PulseChain from launch. Can be staked natively in the HEX staking contract on PulseChain.
- **eHEX** (`0x57fd0a...`) — HEX that was bridged from Ethereum to PulseChain. Has a different contract address. **Cannot** be staked in the pHEX staking contract.

### Are bridged stablecoins (pDAI, pUSDC, pUSDT) worth $1?

No. Bridged stablecoins on PulseChain (pDAI, pUSDC, pUSDT) trade at market prices and are **not** pegged to $1. Always check the live on-chain price before assuming their value.

### What is PulseX?

PulseX is PulseChain's official decentralized exchange (DEX). It allows users to swap tokens, provide liquidity (earn trading fees), and farm INC rewards by staking LP tokens. It has two versions: V1 and V2.

### What is HEX staking?

HEX is a blockchain certificate of deposit. You lock ("stake") HEX for a chosen period (1 day to 5555 days) and receive T-shares, which earn a portion of daily interest payouts. Longer and larger stakes receive more T-shares. Stakes that end late incur penalties.

### What is a T-Share?

T-shares are units that represent your share of the HEX staking pool's daily interest payouts. The more T-shares you hold, the more HEX you earn each day from the pool.

### What is Hedron?

Hedron allows HEX stakers to tokenize their stakes as HSI (HEX Stake Instance) tokens. These can be traded or used in DeFi, making otherwise illiquid HEX stakes transferable.

### What is Maximus?

Maximus is a set of community-run HEX staking pools. Instead of staking HEX individually, you can contribute to a shared pool (Base, Deci, Lucky, etc.) and receive Maximus tokens representing your share. It lowers the complexity and capital requirement for long-term HEX staking.

### What is INC?

INC is the farm incentive token for PulseX. Liquidity providers who stake their LP tokens in PulseX farms earn INC rewards. INC has no fixed supply cap and is continuously emitted to reward liquidity providers.

### What is PLSX?

PLSX is the PulseX DEX token. A portion of all trading fees on PulseX is used to buy and burn PLSX, reducing supply over time. Holding PLSX means holding a stake in PulseX's fee-burning mechanism.

### How do I get PLS?

You can acquire PLS via:
1. Fiat on-ramp (0xCoast or Guardarian)
2. Bridging from Ethereum to PulseChain via the Official PulseChain Bridge
3. Purchasing on a centralized exchange that lists PLS and withdrawing to PulseChain
4. Trading on PulseX if you already have tokens on PulseChain

### What is the Official PulseChain Bridge?

The official bridge allows you to move tokens between Ethereum and PulseChain. When you bridge a token from Ethereum to PulseChain, you receive a wrapped version of it on PulseChain (e.g., bridging ETH gives you pWETH on PulseChain).

### What is Liquid Loans?

Liquid Loans is a decentralized lending protocol on PulseChain. Users can deposit PLS as collateral to borrow USDL (a stablecoin) without interest, similar to MakerDAO/Liquity on Ethereum.

### What is the PulseChain validator system?

PulseChain uses a Proof-of-Stake consensus with validators who stake PLS to secure the network and earn rewards. You can track validator statistics and staking metrics on PulseChainStats.

### Where can I see PulseChain ecosystem stats?

- **PulseChainStats** (pulsechainstats.com) — TVL, validator data, ecosystem metrics
- **DeFi Llama** — TVL by protocol
- **DexScreener** — Token prices and DEX pair analytics
- **PulseCoinList** — Ecosystem directory with project links

### Is PulseChain safe to use?

PulseChain is EVM-compatible and uses battle-tested smart contract technology. However, as with all DeFi, risks include: smart contract bugs, bridged token depeg risk, liquidity risk, and general market volatility. Always do your own research (DYOR) and only use funds you can afford to lose.
