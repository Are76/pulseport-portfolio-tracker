export type PortfolioDataStatus = 'available' | 'partial' | 'unavailable';
export type PortfolioComputationStatus = 'available' | 'unavailable';

export type PortfolioBalanceDto = {
  assetId: string;
  symbol: string;
  quantity: string;
  pricingStatus: PortfolioComputationStatus;
  valuationStatus: PortfolioComputationStatus;
  priceUsd: number | null;
  valueUsd: number | null;
};

export type PortfolioDashboardSummaryDto = {
  totalValueUsd: number;
  pricedAssetCount: number;
  unpricedAssetCount: number;
  warnings: string[];
};

export type PortfolioDashboardDto = {
  schemaVersion: 'v1';
  walletAddress: string;
  chainId: number;
  asOf: string;
  status: PortfolioDataStatus;
  balances: PortfolioBalanceDto[];
  warnings: string[];
  summary: PortfolioDashboardSummaryDto;
};

export type PortfolioDashboardErrorDto = {
  code: string;
  message: string;
};

export type PortfolioDashboardSuccessResponse = {
  ok: true;
  data: PortfolioDashboardDto;
  error: null;
};

export type PortfolioDashboardFailureResponse = {
  ok: false;
  data: null;
  error: PortfolioDashboardErrorDto;
};

export type PortfolioDashboardResponse =
  | PortfolioDashboardSuccessResponse
  | PortfolioDashboardFailureResponse;
