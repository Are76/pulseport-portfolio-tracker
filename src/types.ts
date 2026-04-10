export type Chain = 'pulsechain' | 'ethereum' | 'base';

export interface Wallet {
  address: string;
  name: string;
}

export interface Asset {
  id: string;
  symbol: string;
  name: string;
  balance: number;
  stakedBalance?: number;
  price: number;
  value: number;
  stakedValue?: number;
  chain: Chain;
  logoUrl?: string;
  pnl24h?: number;
  priceChange24h?: number;
  priceChange1h?: number;
  priceChange7d?: number;
  isCore?: boolean;
  isBridged?: boolean;
  entryPls?: number;
}

export interface HexStake {
  id: string;
  stakeId: number;
  stakedHearts: bigint;
  stakeShares: bigint;
  lockedDay: number;
  stakedDays: number;
  unlockedDay: number;
  isAutoStake: boolean;
  progress: number; // 0 to 100
  estimatedValueUsd: number;
  interestHearts?: bigint;
  totalValueUsd?: number;
  chain: 'pulsechain' | 'ethereum';
  walletLabel?: string;
  walletAddress?: string;
  daysRemaining?: number;
  tShares?: number;
  stakedHex?: number;
  stakeHexYield?: number;
}

export interface LpPosition {
  pairAddress: string;
  pairName: string;
  token0Address: string;
  token1Address: string;
  token0Symbol: string;
  token1Symbol: string;
  token0Decimals: number;
  token1Decimals: number;
  token0Amount: number;
  token1Amount: number;
  token0Usd: number;
  token1Usd: number;
  totalUsd: number;
  lpBalance: number;
}

export interface FarmPosition {
  poolId: number;
  lpAddress: string;
  pairName: string;
  token0Symbol: string;
  token1Symbol: string;
  token0Address: string;
  token1Address: string;
  stakedLp: number;
  token0Amount: number;
  token1Amount: number;
  token0Usd: number;
  token1Usd: number;
  totalUsd: number;
  pendingInc: number;
  pendingIncUsd: number;
}

export interface PortfolioSummary {
  totalValue: number;
  pnl24h: number;
  pnl24hPercent: number;
  chainDistribution: Record<Chain, number>;
  nativeValue: number;
  netInvestment: number;
  unifiedPnl: number;
  realizedPnl: number;
  chainPnlUsd: Record<Chain, number>;
  chainPnlPercent: Record<Chain, number>;
}

export interface HistoryPoint {
  timestamp: number;
  value: number;
  nativeValue: number; // Value in PLS
  pnl: number;
  chainPnl?: Record<Chain, number>;
}

export type TransactionType = 'trade' | 'transfer_in' | 'transfer_out' | 'swap' | 'stake' | 'unstake';

export interface Transaction {
  id: string;
  hash: string;
  timestamp: number;
  type: TransactionType;
  from: string;
  to: string;
  asset: string;
  amount: number;
  valueUsd?: number;
  fee?: number;
  chain: Chain;
  counterAsset?: string;
  counterAmount?: number;
}
