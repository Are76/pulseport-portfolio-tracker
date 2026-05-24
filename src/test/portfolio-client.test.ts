import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchPortfolioDashboard } from '../lib/api/portfolio-client';

const okResponse = {
  ok: true as const,
  data: {
    schemaVersion: 'v1' as const,
    walletAddress: '0x0000000000000000000000000000000000000001',
    chainId: 369,
    asOf: new Date().toISOString(),
    status: 'partial' as const,
    balances: [],
    warnings: [],
    summary: { totalValueUsd: 0, pricedAssetCount: 0, unpricedAssetCount: 0, warnings: [] },
  },
  error: null,
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('fetchPortfolioDashboard', () => {
  it('omits chainId when undefined', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      json: async () => okResponse,
    } as Response);

    await fetchPortfolioDashboard({ walletAddress: okResponse.data.walletAddress });

    expect(fetchSpy).toHaveBeenCalledWith(
      `/api/portfolio/dashboard?walletAddress=${encodeURIComponent(okResponse.data.walletAddress)}`,
    );
  });

  it.each([369, 0, Number.NaN])('includes chainId when explicitly provided (%s)', async chainId => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      json: async () => okResponse,
    } as Response);

    await fetchPortfolioDashboard({ walletAddress: okResponse.data.walletAddress, chainId });

    expect(fetchSpy).toHaveBeenCalledWith(
      `/api/portfolio/dashboard?walletAddress=${encodeURIComponent(okResponse.data.walletAddress)}&chainId=${encodeURIComponent(String(chainId))}`,
    );
  });
});
