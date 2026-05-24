import type { PortfolioDashboardResponse } from '../../server/portfolio/portfolio-types';

export async function fetchPortfolioDashboard(params: {
  walletAddress: string;
  chainId?: number;
}): Promise<PortfolioDashboardResponse> {
  const query = new URLSearchParams({
    walletAddress: params.walletAddress,
    ...(params.chainId ? { chainId: String(params.chainId) } : {}),
  });

  const response = await fetch(`/api/portfolio/dashboard?${query.toString()}`);

  return (await response.json()) as PortfolioDashboardResponse;
}
