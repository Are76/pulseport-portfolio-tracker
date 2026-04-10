/**
 * HEX Contract ABI (Minimal for querying stakes)
 */
export const HEX_ABI = [
  {
    "constant": true,
    "inputs": [
      {
        "name": "user",
        "type": "address"
      }
    ],
    "name": "stakeCount",
    "outputs": [
      {
        "name": "",
        "type": "uint256"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [
      {
        "name": "user",
        "type": "address"
      },
      {
        "name": "stakeIndex",
        "type": "uint256"
      }
    ],
    "name": "stakeLists",
    "outputs": [
      {
        "name": "stakeId",
        "type": "uint40"
      },
      {
        "name": "stakedHearts",
        "type": "uint72"
      },
      {
        "name": "stakeShares",
        "type": "uint72"
      },
      {
        "name": "lockedDay",
        "type": "uint16"
      },
      {
        "name": "stakedDays",
        "type": "uint16"
      },
      {
        "name": "unlockedDay",
        "type": "uint16"
      },
      {
        "name": "isAutoStake",
        "type": "bool"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "currentDay",
    "outputs": [
      {
        "name": "",
        "type": "uint256"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [
      { "name": "beginDay", "type": "uint256" },
      { "name": "endDay", "type": "uint256" }
    ],
    "name": "dailyDataRange",
    "outputs": [
      { "name": "listData", "type": "uint256[]" }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  }
] as const;

// PulseX LP pair addresses for on-chain price calculation
// token0/token1 order matters for reserve math — verified against chain
export const PULSEX_LP_PAIRS = {
  // WPLS price oracle pairs (token0 = stablecoin, token1 = WPLS)
  WPLS_DAI:  '0xe56043671df55de5cdf8459710433c10324de0ae',  // token0=WPLS(18),  token1=pDAI(18)
  WPLS_USDC: '0x6753560538eca67617a9ce605178f788be7e524e',  // token0=pUSDC(6),  token1=WPLS(18)
  WPLS_USDT: '0x322df7921f28f1146cdf62afdac0d6bc0ab80711',  // token0=pUSDT(6),  token1=WPLS(18)
  // Token/WPLS pairs (token0 = token, token1 = WPLS, except pWBTC which is reversed)
  PLSX_WPLS:  '0x1b45b9148791d3a104184cd5dfe5ce57193a3ee9', // token0=PLSX(18),  token1=WPLS(18)
  INC_WPLS:   '0xf808bb6265e9ca27002c0a04562bf50d4fe37eaa', // token0=INC(18),   token1=WPLS(18)
  PHEX_WPLS:  '0xf1f4ee610b2babb05c635f726ef8b0c568c8dc65', // token0=pHEX(8),   token1=WPLS(18)
  PWETH_WPLS: '0x42abdfdb63f3282033c766e72cc4810738571609', // token0=pWETH(18), token1=WPLS(18)
  PWBTC_WPLS: '0xdb82b0919584124a0eb176ab136a0cc9f148b2d1', // token0=WPLS(18),  token1=pWBTC(8) — REVERSED
  PRVX_USDC:     '0x7f681a5ad615238357ba148c281e2eaefd2de55a', // token0=pUSDC(6),     token1=PRVX(18) — $1M liquidity, best oracle
  PRVX_WPLS:     '0x62f7d076c92db76cf84223b6309801ea461d7afe', // token0=WPLS(18),     token1=PRVX(18) — REVERSED, $84K only
  // System copy tokens (fork-copy of Ethereum tokens — NOT the bridged versions)
  PDAI_SYS_WPLS: '0xae8429918fdbf9a5867e3243697637dc56aa76a1', // token0=pDAI_sys(18), token1=WPLS(18)
};

export const PULSEX_V2_PAIR_ABI = [
  {
    "constant": true,
    "inputs": [],
    "name": "getReserves",
    "outputs": [
      { "name": "reserve0", "type": "uint112" },
      { "name": "reserve1", "type": "uint112" },
      { "name": "blockTimestampLast", "type": "uint32" }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  }
] as const;

export const CHAINS = {
  ethereum: {
    id: 1,
    name: 'Ethereum',
    rpc: 'https://cloudflare-eth.com',
    fallbackRpcs: [
      'https://eth.llamarpc.com',
      'https://ethereum-rpc.publicnode.com',
      'https://1rpc.io/eth',
      'https://eth.drpc.org'
    ],
    explorer: 'https://etherscan.io',
    color: '#627EEA',
    hexAddress: '0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39'
  },
  pulsechain: {
    id: 369,
    name: 'PulseChain',
    rpc: 'https://rpc-pulsechain.g4mm4.io',
    fallbackRpcs: [
      'https://rpc.pulsechain.com',
      'https://pulsechain.drpc.org',
      'https://pulsechain-rpc.publicnode.com'
    ],
    explorer: 'https://scan.pulsechain.com',
    api: 'https://scan.pulsechain.com/api',
    subgraph: 'https://graph.pulsechain.com/subgraphs/name/pulsechain/pulsex',
    color: '#f739ff',
    hexAddress: '0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39'
  },
  base: {
    id: 8453,
    name: 'Base',
    rpc: 'https://mainnet.base.org',
    explorer: 'https://basescan.org',
    color: '#0052FF'
  }
};

export const TOKENS = {
  pulsechain: [
    { symbol: 'PLS', address: 'native', decimals: 18, coinGeckoId: 'pulsechain' },
    { symbol: 'WPLS', address: '0xA1077a294dDE1B09bB078844df40758a5D0f9a27', decimals: 18, coinGeckoId: 'wrapped-pulse' },
    { symbol: 'PLSX', address: '0x95b303987a60c71504d99aa1b13b4da07b0790ab', decimals: 18, coinGeckoId: 'pulsex' },
    { symbol: 'HEX', address: '0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39', decimals: 8, coinGeckoId: 'hex' },
    { symbol: 'eHEX', name: 'HEX (from Ethereum)', address: '0x57fde0a71132198bbec939b98976993d8d89d225', decimals: 8, coinGeckoId: 'hex', bridged: true },
    { symbol: 'INC', address: '0x2fa878ab3f87cc1c9737fc071108f904c0b0c95d', decimals: 18, coinGeckoId: 'incentive' },
    { symbol: 'pDAI', name: 'DAI (System Copy)', address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', decimals: 18, coinGeckoId: 'dai' },
    { symbol: 'DAI', name: 'DAI (from Ethereum)', address: '0xefd766ccb38eaf1dfd701853bfce31359239f305', decimals: 18, coinGeckoId: 'dai', bridged: true },
    { symbol: 'WETH', name: 'WETH (from Ethereum)', address: '0x02dcdd04e3f455d838cd1249292c58f3b79e3c3c', decimals: 18, coinGeckoId: 'ethereum', bridged: true },
    { symbol: 'WBTC', name: 'WBTC (from Ethereum)', address: '0xb17d901469b9208b17d916112988a3fed19b5ca1', decimals: 8, coinGeckoId: 'wrapped-bitcoin', bridged: true },
    { symbol: 'PRVX', address: '0xf6f8db0aba00007681f8faf16a0fda1c9b030b11', decimals: 18, coinGeckoId: 'privacyx' },
    { symbol: 'USDT', name: 'USDT (from Ethereum)', address: '0x0cb6f5a34ad42ec934882a05265a7d5f59b51a2f', decimals: 6, coinGeckoId: 'tether', bridged: true },
    { symbol: 'USDC', name: 'USDC (from Ethereum)', address: '0x15d38573d2feeb82e7ad5187ab8c1d52810b1f07', decimals: 6, coinGeckoId: 'usd-coin', bridged: true },
    { symbol: 'L-USDC', name: 'USDC (Liberty Bridge)', address: '0x80316335349e52643527C6986816E6c483478248', decimals: 6, coinGeckoId: 'usd-coin', bridged: true },
    { symbol: 'B-USDC', name: 'USDC (from Base)', address: '0x41527c4d9d47ef03f00f77d794c87ba94832700b', decimals: 6, coinGeckoId: 'usd-coin', bridged: true },
  ],
  ethereum: [
    { symbol: 'ETH', address: 'native', decimals: 18, coinGeckoId: 'ethereum' },
    { symbol: 'HEX', address: '0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39', decimals: 8, coinGeckoId: 'hex' },
    { symbol: 'USDC', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6, coinGeckoId: 'usd-coin' },
    { symbol: 'USDT', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6, coinGeckoId: 'tether' },
  ],
  base: [
    { symbol: 'ETH', address: 'native', decimals: 18, coinGeckoId: 'ethereum' },
    { symbol: 'USDC', address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6, coinGeckoId: 'usd-coin' },
  ]
};
