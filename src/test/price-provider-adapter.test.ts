import { describe, expect, it } from 'vitest';

import { createInMemoryPriceObservationRepository } from '../server/portfolio/price-observation-repository';
import { createDeterministicFixturePriceProvider } from '../server/portfolio/price-provider-adapter';

const fixtureRecord = {
  providerObservationId: 'fixture-obs-1',
  providerAssetId: 'fixture:erc20:369:0xabc',
  assetId: 'erc20:369:0xabc',
  chainId: 369,
  observedAt: '2026-05-25T00:00:00.000Z',
  staleAfter: '2026-05-25T01:00:00.000Z',
  ingestedAt: '2026-05-25T00:00:30.000Z',
  priceUsdAtomic: '123450000',
  confidenceBps: 9800,
  sourceKind: 'indexer' as const,
  sourcePriority: 12,
  sourceFeed: 'pair:pls/usdc',
};

describe('price provider adapter contract', () => {
  it('returns upstream observation inputs only and never persists directly', async () => {
    const repository = createInMemoryPriceObservationRepository();
    const adapter = createDeterministicFixturePriceProvider([fixtureRecord]);

    const before = repository.getObservationsForAsset("erc20:369:0xabc", 369);
    const result = await adapter.getPriceObservations([{ assetId: 'erc20:369:0xabc', chainId: 369 }]);
    const after = repository.getObservationsForAsset("erc20:369:0xabc", 369);

    expect(before).toEqual([]);
    expect(after).toEqual([]);

    expect(result.unsupportedAssets).toEqual([]);
    expect(result.observations).toHaveLength(1);
    expect(result.observations[0]).toMatchObject({
      provider: 'fixture-deterministic',
      providerObservationId: 'fixture-obs-1',
      providerAssetId: 'fixture:erc20:369:0xabc',
      assetId: 'erc20:369:0xabc',
      chainId: 369,
      sourceKind: 'indexer',
      sourcePriority: 12,
      sourceFeed: 'pair:pls/usdc',
      priceUsdAtomic: '123450000',
      confidenceBps: 9800,
    });
    expect(result.observations[0].metadata.providerName).toBe('Deterministic Fixture Provider');
    expect(result.observations[0].metadata.providerSource).toBe('test-fixture');
  });

  it('surfaces unsupported assets explicitly and preserves chain-aware identity boundaries', async () => {
    const adapter = createDeterministicFixturePriceProvider([fixtureRecord]);
    const result = await adapter.getPriceObservations([
      { assetId: 'erc20:369:0xabc', chainId: 369 },
      { assetId: 'erc20:943:0xabc', chainId: 943 },
      { assetId: 'PLS', chainId: 369 },
    ]);

    expect(result.observations).toHaveLength(1);
    expect(result.unsupportedAssets).toEqual([
      {
        assetId: 'erc20:943:0xabc',
        chainId: 943,
        reason: 'Unsupported asset for deterministic fixture provider.',
      },
      {
        assetId: 'PLS',
        chainId: 369,
        reason: 'Unsupported asset for deterministic fixture provider.',
      },
    ]);
  });
});
