import { describe, expect, it, vi } from 'vitest';

import { createDexScreenerPriceProvider } from '../server/portfolio/dexscreener-price-provider';

function buildJsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function buildProvider(fetchMock: ReturnType<typeof vi.fn>, nowIso = '2026-05-27T00:00:00.000Z') {
  return createDexScreenerPriceProvider({ fetchImpl: fetchMock as unknown as typeof fetch, now: () => new Date(nowIso) });
}

describe('DexScreenerPriceProvider', () => {
  const nowIso = '2026-05-27T00:00:00.000Z';
  const supportedAssetId = 'erc20:369:0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

  it('valid PulseChain ERC-20 asset produces one normalized upstream observation', async () => {
    const fetchMock = vi.fn().mockResolvedValue(buildJsonResponse({
      pairs: [{
        chainId: 'pulsechain',
        pairAddress: '0x1111111111111111111111111111111111111111',
        url: 'https://dexscreener.com/pulsechain/0x1111111111111111111111111111111111111111',
        priceUsd: '0.1234',
        liquidity: { usd: 111 },
        baseToken: { address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' },
      }],
    }));

    const provider = buildProvider(fetchMock, nowIso);
    const result = await provider.getPriceObservations([{ assetId: supportedAssetId, chainId: 369 }]);

    expect(result.unsupportedAssets).toEqual([]);
    expect(result.observations).toHaveLength(1);
    expect(result.observations[0]).toMatchObject({
      provider: 'dexscreener',
      providerAssetId: 'token/pulsechain/0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      assetId: supportedAssetId,
      chainId: 369,
      sourceKind: 'indexer',
      sourcePriority: 90,
      priceUsdAtomic: '123400',
      confidenceBps: 3500,
      observedAt: nowIso,
      ingestedAt: nowIso,
      staleAfter: '2026-05-27T00:05:00.000Z',
    });
  });

  it('priceUsdAtomic parses decimal strings deterministically without floating point', async () => {
    const fetchMock = vi.fn().mockResolvedValue(buildJsonResponse({
      pairs: [{ chainId: 'pulsechain', pairAddress: '0x1111111111111111111111111111111111111111', priceUsd: '1.23', liquidity: { usd: 100 }, baseToken: { address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' } }],
    }));

    const provider = buildProvider(fetchMock);
    const result = await provider.getPriceObservations([{ assetId: supportedAssetId, chainId: 369 }]);
    expect(result.observations[0].priceUsdAtomic).toBe('1230000');
  });

  it('long decimal and large integer price strings remain deterministic and bigint-safe', async () => {
    const longDecimal = '123456789012345678901234567890.123456789123456789';
    const fetchMock = vi.fn().mockResolvedValue(buildJsonResponse({
      pairs: [{ chainId: 'pulsechain', pairAddress: '0x1111111111111111111111111111111111111111', priceUsd: longDecimal, liquidity: { usd: 100 }, baseToken: { address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' } }],
    }));

    const provider = buildProvider(fetchMock);
    const result = await provider.getPriceObservations([{ assetId: supportedAssetId, chainId: 369 }]);
    expect(result.observations[0].priceUsdAtomic).toBe('123456789012345678901234567890123456');
  });

  it('below-scale fractional prices deterministically truncate to zero and fail closed', async () => {
    const fetchMock = vi.fn().mockResolvedValue(buildJsonResponse({
      pairs: [{ chainId: 'pulsechain', pairAddress: '0x1111111111111111111111111111111111111111', priceUsd: '0.0000001', liquidity: { usd: 100 }, baseToken: { address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' } }],
    }));

    const provider = buildProvider(fetchMock);
    const result = await provider.getPriceObservations([{ assetId: supportedAssetId, chainId: 369 }]);
    expect(result.observations).toEqual([]);
    expect(result.unsupportedAssets).toHaveLength(1);
  });

  it('zero/negative/non-numeric/exponent/Infinity/NaN priceUsd fail closed', async () => {
    const invalidPrices = ['0', '-1', 'Infinity', 'NaN', 'abc', '1e-3'];

    for (const invalidPrice of invalidPrices) {
      const fetchMock = vi.fn().mockResolvedValue(buildJsonResponse({
        pairs: [{ chainId: 'pulsechain', pairAddress: '0x1111111111111111111111111111111111111111', priceUsd: invalidPrice, liquidity: { usd: 100 }, baseToken: { address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' } }],
      }));
      const provider = buildProvider(fetchMock);
      const result = await provider.getPriceObservations([{ assetId: supportedAssetId, chainId: 369 }]);
      expect(result.observations).toEqual([]);
      expect(result.unsupportedAssets).toHaveLength(1);
    }
  });

  it('unsupported chain and unsupported assetId do not call fetch', async () => {
    const fetchMock = vi.fn();
    const provider = buildProvider(fetchMock);

    await provider.getPriceObservations([{ assetId: 'erc20:943:0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', chainId: 943 }]);
    await provider.getPriceObservations([{ assetId: 'PLS', chainId: 369 }]);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('missing/empty pairs returns unsupported asset', async () => {
    const fetchMock = vi.fn().mockResolvedValue(buildJsonResponse({ pairs: [] }));
    const provider = buildProvider(fetchMock);
    const result = await provider.getPriceObservations([{ assetId: supportedAssetId, chainId: 369 }]);
    expect(result.observations).toEqual([]);
    expect(result.unsupportedAssets[0].reason).toContain('No DexScreener pairs');
  });

  it('malformed response fails closed without throwing', async () => {
    const fetchMock = vi.fn().mockResolvedValue(buildJsonResponse({ nope: true }));
    const provider = buildProvider(fetchMock);
    const result = await provider.getPriceObservations([{ assetId: supportedAssetId, chainId: 369 }]);
    expect(result.observations).toEqual([]);
    expect(result.unsupportedAssets).toHaveLength(1);
  });

  it('fetch rejection fails closed', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('network down'));
    const provider = buildProvider(fetchMock);
    const result = await provider.getPriceObservations([{ assetId: supportedAssetId, chainId: 369 }]);
    expect(result.observations).toEqual([]);
    expect(result.unsupportedAssets).toHaveLength(1);
  });

  it('non-200 HTTP response fails closed', async () => {
    const fetchMock = vi.fn().mockResolvedValue(buildJsonResponse({ message: 'error' }, 503));
    const provider = buildProvider(fetchMock);
    const result = await provider.getPriceObservations([{ assetId: supportedAssetId, chainId: 369 }]);
    expect(result.observations).toEqual([]);
    expect(result.unsupportedAssets[0].reason).toContain('HTTP 503');
  });

  it('malformed liquidity fails closed', async () => {
    const fetchMock = vi.fn().mockResolvedValue(buildJsonResponse({
      pairs: [{ chainId: 'pulsechain', pairAddress: '0x1111111111111111111111111111111111111111', priceUsd: '1', liquidity: { usd: 'NaN' }, baseToken: { address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' } }],
    }));
    const provider = buildProvider(fetchMock);
    const result = await provider.getPriceObservations([{ assetId: supportedAssetId, chainId: 369 }]);
    expect(result.observations).toEqual([]);
    expect(result.unsupportedAssets).toHaveLength(1);
  });

  it('missing liquidity is treated as zero and valid liquidity ranks deterministically', async () => {
    const pairMissingLiquidity = {
      chainId: 'pulsechain', pairAddress: '0x000000000000000000000000000000000000000a', priceUsd: '1.00', baseToken: { address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' },
    };
    const pairHighLiquidity = {
      chainId: 'pulsechain', pairAddress: '0x000000000000000000000000000000000000000b', priceUsd: '2.00', liquidity: { usd: 20 }, baseToken: { address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' },
    };

    const fetchMockOne = vi.fn().mockResolvedValue(buildJsonResponse({ pairs: [pairMissingLiquidity, pairHighLiquidity] }));
    const fetchMockTwo = vi.fn().mockResolvedValue(buildJsonResponse({ pairs: [pairHighLiquidity, pairMissingLiquidity] }));

    const providerOne = buildProvider(fetchMockOne, nowIso);
    const providerTwo = buildProvider(fetchMockTwo, nowIso);

    const req = [{ assetId: supportedAssetId, chainId: 369 }];
    const first = await providerOne.getPriceObservations(req);
    const second = await providerTwo.getPriceObservations(req);

    expect(first.observations[0].metadata.selectedPairAddress).toBe('0x000000000000000000000000000000000000000b');
    expect(first.observations[0]).toEqual(second.observations[0]);
  });
});
