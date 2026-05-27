import { describe, expect, it, vi } from 'vitest';

import { createDexScreenerPriceProvider } from '../server/portfolio/dexscreener-price-provider';

function buildJsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('DexScreenerPriceProvider', () => {
  const nowIso = '2026-05-27T00:00:00.000Z';

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

    const provider = createDexScreenerPriceProvider({ fetchImpl: fetchMock as typeof fetch, now: () => new Date(nowIso) });
    const result = await provider.getPriceObservations([{ assetId: 'erc20:369:0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', chainId: 369 }]);

    expect(result.unsupportedAssets).toEqual([]);
    expect(result.observations).toHaveLength(1);
    expect(result.observations[0]).toMatchObject({
      provider: 'dexscreener',
      providerAssetId: 'token/pulsechain/0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      assetId: 'erc20:369:0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      chainId: 369,
      sourceKind: 'indexer',
      sourcePriority: 90,
      priceUsdAtomic: '123400',
      confidenceBps: 3500,
      observedAt: nowIso,
      ingestedAt: nowIso,
      staleAfter: '2026-05-27T00:05:00.000Z',
    });
    expect(result.observations[0].metadata.selectedPairAddress).toBe('0x1111111111111111111111111111111111111111');
  });

  it('unsupported chain returns unsupported asset explicitly', async () => {
    const provider = createDexScreenerPriceProvider({ fetchImpl: vi.fn() as unknown as typeof fetch });
    const result = await provider.getPriceObservations([{ assetId: 'erc20:943:0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', chainId: 943 }]);
    expect(result.observations).toEqual([]);
    expect(result.unsupportedAssets[0].reason).toContain('Unsupported chain');
  });

  it('unsupported assetId format returns unsupported asset', async () => {
    const provider = createDexScreenerPriceProvider({ fetchImpl: vi.fn() as unknown as typeof fetch });
    const result = await provider.getPriceObservations([{ assetId: 'PLS', chainId: 369 }]);
    expect(result.observations).toEqual([]);
    expect(result.unsupportedAssets[0].reason).toContain('Unsupported assetId format');
  });

  it('missing/empty pairs returns unsupported asset', async () => {
    const fetchMock = vi.fn().mockResolvedValue(buildJsonResponse({ pairs: [] }));
    const provider = createDexScreenerPriceProvider({ fetchImpl: fetchMock as typeof fetch });
    const result = await provider.getPriceObservations([{ assetId: 'erc20:369:0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', chainId: 369 }]);
    expect(result.observations).toEqual([]);
    expect(result.unsupportedAssets[0].reason).toContain('No DexScreener pairs');
  });

  it('malformed response fails closed without throwing', async () => {
    const fetchMock = vi.fn().mockResolvedValue(buildJsonResponse({ nope: true }));
    const provider = createDexScreenerPriceProvider({ fetchImpl: fetchMock as typeof fetch });
    const result = await provider.getPriceObservations([{ assetId: 'erc20:369:0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', chainId: 369 }]);
    expect(result.observations).toEqual([]);
    expect(result.unsupportedAssets).toHaveLength(1);
  });

  it('invalid priceUsd values fail closed', async () => {
    const fetchMock = vi.fn().mockResolvedValue(buildJsonResponse({
      pairs: [{
        chainId: 'pulsechain',
        pairAddress: '0x1111111111111111111111111111111111111111',
        priceUsd: 'NaN',
        baseToken: { address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' },
      }],
    }));
    const provider = createDexScreenerPriceProvider({ fetchImpl: fetchMock as typeof fetch });
    const result = await provider.getPriceObservations([{ assetId: 'erc20:369:0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', chainId: 369 }]);
    expect(result.observations).toEqual([]);
    expect(result.unsupportedAssets).toHaveLength(1);
  });

  it('multiple pairs are selected deterministically and reversed pair order is stable', async () => {
    const pairA = {
      chainId: 'pulsechain', pairAddress: '0x000000000000000000000000000000000000000a', priceUsd: '1.00', liquidity: { usd: 10 }, baseToken: { address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' },
    };
    const pairB = {
      chainId: 'pulsechain', pairAddress: '0x000000000000000000000000000000000000000b', priceUsd: '2.00', liquidity: { usd: 20 }, baseToken: { address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' },
    };

    const fetchMockOne = vi.fn().mockResolvedValue(buildJsonResponse({ pairs: [pairA, pairB] }));
    const fetchMockTwo = vi.fn().mockResolvedValue(buildJsonResponse({ pairs: [pairB, pairA] }));

    const providerOne = createDexScreenerPriceProvider({ fetchImpl: fetchMockOne as typeof fetch, now: () => new Date(nowIso) });
    const providerTwo = createDexScreenerPriceProvider({ fetchImpl: fetchMockTwo as typeof fetch, now: () => new Date(nowIso) });

    const req = [{ assetId: 'erc20:369:0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', chainId: 369 }];
    const first = await providerOne.getPriceObservations(req);
    const second = await providerTwo.getPriceObservations(req);

    expect(first.observations[0].metadata.selectedPairAddress).toBe('0x000000000000000000000000000000000000000b');
    expect(first.observations[0]).toEqual(second.observations[0]);
  });

  it('observation includes provenance/confidence/staleAfter/source metadata', async () => {
    const fetchMock = vi.fn().mockResolvedValue(buildJsonResponse({
      pairs: [{
        chainId: 'pulsechain', pairAddress: '0x1111111111111111111111111111111111111111', priceUsd: '1', liquidity: { usd: 1 }, baseToken: { address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' }, url: 'https://dexscreener.com/foo',
      }],
    }));
    const provider = createDexScreenerPriceProvider({ fetchImpl: fetchMock as typeof fetch, now: () => new Date(nowIso) });
    const result = await provider.getPriceObservations([{ assetId: 'erc20:369:0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', chainId: 369 }]);
    expect(result.observations[0].confidenceBps).toBe(3500);
    expect(result.observations[0].staleAfter).toBe('2026-05-27T00:05:00.000Z');
    expect(result.observations[0].sourceFeed).toBe('https://dexscreener.com/foo');
    expect(result.observations[0].metadata.providerSource).toBe('upstream-observation');
  });
});
