export type HexStakeDataStatus = 'available' | 'partial' | 'unavailable';
export type HexStakeMetricStatus = 'exact' | 'estimated' | 'unsupported' | 'unknown';
export type HexStakeComputationStatus = 'available' | 'unavailable' | 'unsupported' | 'unknown';

export type HexStakeProvenanceDto = {
  source: string;
  observedAt: string;
  notes?: string[];
};

export type HexStakePositionDto = {
  stakeId: string;
  stakeSource: 'native' | 'hsi' | 'htt';
  stakeStatus: 'pending' | 'active' | 'overdue' | 'ended' | 'unsupported';
  chainId: number;
  assetId: string;
  contractAddress: string;
  lockedDay: number | null;
  stakedDays: number | null;
  unlockedDay: number | null;
  principalHex: string | null;
  stakeShares: string | null;
  tShares: string | null;
  yieldHex: string | null;
  bpdYield: string | null;
  bpdYieldStatus: HexStakeMetricStatus;
  pricing: {
    status: HexStakeComputationStatus;
    priceUsd: number | null;
    source: string | null;
    observedAt: string | null;
  };
  valuation: {
    status: HexStakeComputationStatus;
    valueUsd: number | null;
  };
  pnl: {
    status: HexStakeComputationStatus;
    realizedUsd: number | null;
    unrealizedUsd: number | null;
  };
  warnings: string[];
  provenance: HexStakeProvenanceDto;
};

export type HexStakeDashboardDto = {
  schemaVersion: 'v1';
  walletAddress: string;
  chainId: number;
  asOf: string;
  status: HexStakeDataStatus;
  positions: HexStakePositionDto[];
  summary: {
    activeStakeCount: number;
    endedStakeCount: number;
    unsupportedStakeCount: number;
    totalPrincipalHex: string;
    totalYieldHex: string;
    totalTShares: string;
    valuationStatus: HexStakeComputationStatus;
    pnlStatus: HexStakeComputationStatus;
    warnings: string[];
  };
  tShareMetrics: {
    status: HexStakeComputationStatus;
    shareRate: string | null;
    tSharePriceHex: string | null;
    tSharePriceUsd: number | null;
    activeTShares: string;
    averagePaidUsdPerTShare: number | null;
    warnings: string[];
  };
  warnings: string[];
  provenance: HexStakeProvenanceDto;
};

export type HexStakeDashboardErrorDto = {
  code: string;
  message: string;
};

export type HexStakeDashboardSuccessResponse = {
  ok: true;
  data: HexStakeDashboardDto;
  error: null;
};

export type HexStakeDashboardFailureResponse = {
  ok: false;
  data: null;
  error: HexStakeDashboardErrorDto;
};

export type HexStakeDashboardResponse =
  | HexStakeDashboardSuccessResponse
  | HexStakeDashboardFailureResponse;
