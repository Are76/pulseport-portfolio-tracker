import type { HexStakeDashboardResponse } from '../../server/hex-stakes/hex-stake-types';

export async function fetchHexStakeDashboard(params: {
  walletAddress: string;
  chainId?: number;
  signal?: AbortSignal;
}): Promise<HexStakeDashboardResponse> {
  const query = new URLSearchParams({
    walletAddress: params.walletAddress,
    ...(params.chainId !== undefined ? { chainId: String(params.chainId) } : {}),
  });

  const response = await fetch(`/api/hex-stakes/dashboard?${query.toString()}`, {
    signal: params.signal,
  });

  return (await response.json()) as HexStakeDashboardResponse;
}
