---
name: pulsechain
description: >
  Deep knowledge of the PulseChain blockchain — its architecture as an Ethereum hard fork,
  the difference between PRC20 and ERC20 tokens, correct contract addresses, live data sources,
  pricing methodology, DEX mechanics, HEX staking, LP positions, farming, and common pitfalls.
  Use this skill whenever working with PulseChain data, building PulseChain apps, answering
  questions about PulseChain tokens or contracts, or fetching on-chain data. Triggers on:
  any mention of PulseChain, PLS, PLSX, INC, pHEX, PulseX, HEX staking on PulseChain,
  wallet addresses in a PulseChain context, or questions about bridged tokens (pDAI, pUSDC, pUSDT, eHEX).
---

# PulseChain Blockchain Knowledge

## What PulseChain Is

PulseChain (chain ID: 369) is a full Ethereum hard fork launched in 2023. It forked Ethereums entire state at a specific block. This means:

- EVM-compatible: same address format, same ABI encoding, same RPC methods as Ethereum
- Every Ethereum address exists on PulseChain with the same balance it had at fork time
- The native gas token is PLS (not ETH)
- Block time is approx 10 seconds

PulseChain is NOT Ethereum. Tokens on PulseChain are separate assets with separate prices.

---

## PRC20 vs ERC20

ERC20 = Ethereum tokens. PRC20 = PulseChain tokens. Same address format, different chain (ID 369).

When Ethereum was forked, all ERC20 tokens were copied to PulseChain as PRC20 tokens at the same addresses but as separate assets with separate prices.

Bridged tokens: when users move tokens from Ethereum to PulseChain via the bridge, new wrapped tokens are minted with DIFFERENT contract addresses.

| Category | Example | Meaning |
|----------|---------|---------|
| PRC20 native | WPLS, PLSX, INC | Created on PulseChain, no Ethereum equivalent |
| PRC20 fork copy | pHEX 0x2b59... | Copied from Ethereum at fork |
| Bridged from ETH | eHEX 0x57fd... | Wrapped Ethereum HEX bridged over |
| Bridged stablecoin | pDAI 0xefd7... | Bridged DAI; price is NOT 1 dollar |

NEVER assume a bridged stablecoin equals 1 dollar. Always use live on-chain price.

---

## Network Configuration

Chain ID: 369
Native token: PLS
Block time: approx 10 seconds
First block: 17233000

RPC Endpoints:
- Primary: https://rpc-pulsechain.g4mm4.io
- Secondary: https://pulsechain.publicnode.com
- Fallback: https://rpc.pulsechain.com
- Testnet: https://rpc-testnet-pulsechain.g4mm4.io

Scanner API: https://api.scan.pulsechain.com/api
Explorer: https://scan.pulsechain.com

---

## Core Token Addresses

One wrong hex digit = wrong contract = silent failure. All addresses lowercase.

### PRC20 Native Tokens

| Symbol | Contract | Decimals |
|--------|----------|----------|
| PLS | native | 18 |
| WPLS | 0xa1077a294dde1b09bb078844df40758a5d0f9a27 | 18 |
| PLSX | 0x95b303987a60c71504d99aa1b13b4da07b0790ab | 18 |
| INC | 0x2fa878ab3f87cc1c9737fc071108f904c0b0c95d | 18 |
| pHEX | 0x2b591e99afe9f32eaa6214f7b7629768c40eeb39 | 8 |

### Bridged Tokens

| Symbol | Contract | Decimals | Note |
|--------|----------|----------|------|
| eHEX | 0x57fde0a71132198bbec939b98976993d8d89d225 | 8 | Cannot stake in pHEX staking |
| pDAI | 0xefd766ccb38eaf1dfd701853bfce31359239f305 | 18 | Price NOT 1 dollar |
| pUSDC | 0x15d38573d2feeb82e7ad5187ab8c1d52810b1f07 | 6 | Price NOT 1 dollar |
| pUSDT | 0x0cb6f5a34ad42ec934882a05265a7d5f59b51a2f | 6 | Price NOT 1 dollar |
| pWETH | 0x02dcdd04e3f455d838cd1249292c58f3b79e3c3c | 18 | |
| pWBTC | 0xb17d901469b9208b17d916112988a3fed19b5ca1 | 8 | |

### DEX Contracts

| Contract | Address |
|----------|---------|
| PulseX V1 Factory | 0x1715a3e4a142d8b698131108995174f37aeaba10d |
| PulseX V2 Factory | 0x29ea7545def87022badc76323f373ea1e707c523 |
| PulseX V2 Router | 0x98bf93ebf5c380c0e6ae8e192a7e2ae08edacc02 |
| MasterChef (farming) | 0xb2ca4a66d3e57a5a9a12043b6bad28249fe302d4 |
| pHEX staking | 0x2b591e99afe9f32eaa6214f7b7629768c40eeb39 |
| HEX Stake Instance (HSI) | 0x8bd3d1472a656e312e94fb1bbdd599b8c51d18e3 |

---

## How to Get Live Prices

Do NOT use DexScreener or PulseX subgraph as primary sources. They lag and rate-limit.
The correct method is direct on-chain LP reserve queries via RPC.

### Step 1: Get PLS/USD from three stablecoin pairs

| Pair | LP Contract | Stablecoin decimals |
|------|-------------|---------------------|
| WPLS/DAI | 0xe56043671df55de5cdf8459710433c10324de0ae | 18 |
| WPLS/USDC | 0x6753560538eca67617a9ce605178f788be7e524e | 6 |
| WPLS/USDT | 0x322df7921f28f1146cdf62afdac0d6bc0ab80711 | 6 |

token0 is stablecoin, token1 is WPLS in all three pairs:

    wplsPriceFromDAI  = (reserve0_DAI / 1e18) / (reserve1_WPLS / 1e18)
    wplsPriceFromUSDC = (reserve0_USDC / 1e6)  / (reserve1_WPLS / 1e18)
    wplsPriceFromUSDT = (reserve0_USDT / 1e6)  / (reserve1_WPLS / 1e18)

Pick the highest — most liquidity = most reliable. Low outlier = thin/broken pair.

### Step 2: Derive token prices

    tokenPriceInWPLS = (reserve1_WPLS / 1e18) / (reserve0_token / 10**decimals)
    tokenPriceUSD = tokenPriceInWPLS * wplsPriceUSD

### Key LP pair contracts

| Pair | LP Contract | token0 | token1 |
|------|-------------|--------|--------|
| PLSX/WPLS | 0x1b45b9148791d3a104184cd5dfe5ce57193a3ee9 | PLSX | WPLS |
| INC/WPLS | 0xf808bb6265e9ca27002c0a04562bf50d4fe37eaa | INC | WPLS |
| pHEX/WPLS | 0xf1f4ee610b2babb05c635f726ef8b0c568c8dc65 | pHEX | WPLS |
| pWETH/WPLS | 0x42abdfdb63f3282033c766e72cc4810738571609 | pWETH | WPLS |
| pWBTC/WPLS | 0xdb82b0919584124a0eb176ab136a0cc9f148b2d1 | WPLS (token0!) | pWBTC (token1!) |

Note on pWBTC: token order is reversed. Always check token0/token1 from the contract.

### Raw eth_call to get reserves (getReserves selector: 0x0902f1ac)

    result is 96-byte hex: [reserve0 32b][reserve1 32b][timestamp 32b]
    reserve0 = BigInt(0x + result.slice(2, 66))
    reserve1 = BigInt(0x + result.slice(66, 130))

---

## Token Balances

### Native PLS (eth_getBalance, returns wei / 1e18)

### ERC20/PRC20 (balanceOf, divide by 10^decimals)

Combine native PLS + WPLS token balance — same asset economically.

### Scanner API token list

GET https://api.scan.pulsechain.com/api?module=account&action=tokenlist&address=0x...
Returns: contractAddress, symbol, name, balance, decimals

---

## LP Positions

PulseX uses UniswapV2-style pairs.

    userShare = userLPBalance / totalSupply
    token0Amount = reserve0 * userShare
    token1Amount = reserve1 * userShare
    usdValue = (token0Normalized * token0PriceUSD) + (token1Normalized * token1PriceUSD)

To find if a token has a pair: call getPair(tokenA, tokenB) on both V1 and V2 factories, both orderings.

---

## Farming (MasterChef)

MasterChef: 0xb2ca4a66d3e57a5a9a12043b6bad28249fe302d4

| Function | Selector | Returns |
|----------|----------|---------|
| poolLength() | 0x081e3eda | pool count |
| poolInfo(uint256) | 0x1526fe27 | lpToken, allocPoint, etc |
| userInfo(uint256,address) | 0x93f1a40b | stakedAmount, rewardDebt |
| pendingInc(uint256,address) | 0xf40f0f52 | pending INC (18 dec) |

Staked LP is in MasterChef NOT the wallet. Check both. Do not double-count.

---

## pHEX Staking

Contract: 0x2b591e99afe9f32eaa6214f7b7629768c40eeb39 (8 decimals)

Function selectors (exact keccak256 — wrong ones silently return 0x):

| Function | Correct Selector | Wrong (silent 0x) |
|----------|-----------------|-------------------|
| currentDay() | 0x5c9302c9 | |
| stakeCount(address) | 0x33060d90 | 0xe519f90e |
| stakeLists(address,uint256) | 0x2607443b | 0x1cc2bc09 |

Decode stake struct (7 x 32-byte words):
- [0:64]   stakeId
- [64:128] stakedHearts -> divide by 1e8 for pHEX amount
- [128:192] stakeShares -> divide by 1e12 for tShares
- [192:256] lockedDay
- [256:320] stakedDays
- [320:384] unlockedDay

    endDay = lockedDay + stakedDays
    daysRemaining = unlockedDay != 0 ? endDay - unlockedDay : endDay - currentDay
    isActive = daysRemaining > 0

Late penalty: kicks in after 14 days past end. effectiveLateDays = daysRemaining < -14 ? daysRemaining + 14 : 0

HSI (tokenized stakes): some stakes live in 0x8bd3d1472a656e312e94fb1bbdd599b8c51d18e3
Use stakeCount -> hsiLists -> stakeLists on main HEX contract.

Yield = sum of (day.payoutPerTShare * tShares) for each day in stake period. Day 356 bonus: tShares * 3643.

---

## Batch RPC

Send array of requests. Keep chunks <= 25-50. Sort results by id.

---

## RPC Validation

Check chainId === 369 (0x171) before using any RPC endpoint.

---

## Common Pitfalls

| Mistake | Correct |
|---------|---------|
| ethPrice in subgraph | Use plsPrice. Better: on-chain reserves |
| pDAI/pUSDC/pUSDT = 1 dollar | Always fetch live price |
| Calling pDAI just DAI | It is pDAI, different asset |
| Wrong WPLS: ...df0118... | Correct: 0xa1077a294dde1b09bb078844df40758a5d0f9a27 |
| Wrong PLSX: ...7915476... | Correct: 0x95b303987a60c71504d99aa1b13b4da07b0790ab |
| Wrong pUSDC: ...38453... | Correct: 0x15d38573d2feeb82e7ad5187ab8c1d52810b1f07 |
| Wrong pUSDT: ...910b4763... | Correct: 0x0cb6f5a34ad42ec934882a05265a7d5f59b51a2f |
| Wrong stakeCount selector | Use 0x33060d90 |
| pHEX decimals = 18 | pHEX is 8 decimals |
| Counting ended stakes | Only isActive = true (daysRemaining > 0) |
| V1/V2 factory swapped | V1 = 0x1715..., V2 = 0x29eA... |
| Forgetting HSI stakes | Check HSI contract too |
| LP in farm vs wallet | Check MasterChef userInfo, do not double-count |
| eHEX vs pHEX | eHEX 0x57fd... cannot be staked in pHEX staking |
