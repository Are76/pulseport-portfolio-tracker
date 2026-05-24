import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchHexStakeDashboard } from '../lib/api/hex-stake-client';

const okResponse = {
  ok: true as const,
  data: {
    schemaVersion: 'v1' as const,
    walletAddress: '0x0000000000000000000000000000000000000001',
    chainId: 369,
    asOf: new Date().toISOString(),
    status: 'partial' as const,
    positions: [],
    summary: { activeStakeCount: 0, endedStakeCount: 0, unsupportedStakeCount: 0, totalPrincipalHex: '0', totalYieldHex: '0', totalTShares: '0', valuationStatus: 'unavailable' as const, pnlStatus: 'unavailable' as const, warnings: [] },
    tShareMetrics: { status: 'unknown' as const, shareRate: null, tSharePriceHex: null, tSharePriceUsd: null, activeTShares: '0', averagePaidUsdPerTShare: null, warnings: [] },
    warnings: [],
    provenance: { source: 'test', observedAt: new Date().toISOString() },
  },
  error: null,
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('fetchHexStakeDashboard', () => {
  it('forwards AbortSignal to fetch', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      json: async () => okResponse,
    } as Response);
    const controller = new AbortController();

    await fetchHexStakeDashboard({ walletAddress: okResponse.data.walletAddress, chainId: 369, signal: controller.signal });

    expect(fetchSpy).toHaveBeenCalledWith(
      `/api/hex-stakes/dashboard?walletAddress=${encodeURIComponent(okResponse.data.walletAddress)}&chainId=369`,
      { signal: controller.signal },
    );
  });
});
