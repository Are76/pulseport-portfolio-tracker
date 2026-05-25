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

  it('does not allow fixture metadata to override reserved provider provenance fields', async () => {
    const adapter = createDeterministicFixturePriceProvider([
      {
        ...fixtureRecord,
        metadata: {
          providerName: 'Spoofed Provider',
          providerSource: 'spoofed-source',
          region: 'us-east-1',
        },
      },
    ]);

    const result = await adapter.getPriceObservations([{ assetId: 'erc20:369:0xabc', chainId: 369 }]);
    expect(result.observations).toHaveLength(1);
    expect(result.observations[0].metadata.providerName).toBe('Deterministic Fixture Provider');
    expect(result.observations[0].metadata.providerSource).toBe('test-fixture');
    expect(result.observations[0].metadata.region).toBe('us-east-1');
  });

  it('throws when duplicate fixture records are provided for same assetId/chainId', () => {
    expect(() => createDeterministicFixturePriceProvider([
      fixtureRecord,
      {
        ...fixtureRecord,
        providerObservationId: 'fixture-obs-2',
      },
    ])).toThrow('Duplicate fixture record for assetId/chainId');
  });

  it('snapshots fixture records so post-construction mutations do not alter outputs', async () => {
    const mutableRecord = {
      ...fixtureRecord,
      metadata: { region: 'us-west-2' },
    };
    const adapter = createDeterministicFixturePriceProvider([mutableRecord]);

    mutableRecord.providerObservationId = 'mutated-observation-id';
    mutableRecord.providerAssetId = 'fixture:erc20:369:0xmutated';
    mutableRecord.priceUsdAtomic = '999999999';
    mutableRecord.metadata.region = 'mutated-region';

    const result = await adapter.getPriceObservations([{ assetId: 'erc20:369:0xabc', chainId: 369 }]);
    expect(result.observations).toHaveLength(1);
    expect(result.observations[0].providerObservationId).toBe('fixture-obs-1');
    expect(result.observations[0].providerAssetId).toBe('fixture:erc20:369:0xabc');
    expect(result.observations[0].priceUsdAtomic).toBe('123450000');
    expect(result.observations[0].metadata.region).toBe('us-west-2');
  });

  it('exposes frozen metadata and keeps provenance stable across mutation attempts', async () => {
    const adapter = createDeterministicFixturePriceProvider([fixtureRecord]);

    expect(Object.isFrozen(adapter.metadata)).toBe(true);

    const mutableMetadata = adapter.metadata as unknown as { id: string; displayName: string; source: string };
    expect(() => {
      mutableMetadata.id = 'spoofed-provider-id';
      mutableMetadata.displayName = 'Spoofed Name';
      mutableMetadata.source = 'spoofed-source';
    }).toThrow();

    const first = await adapter.getPriceObservations([{ assetId: 'erc20:369:0xabc', chainId: 369 }]);
    const second = await adapter.getPriceObservations([{ assetId: 'erc20:369:0xabc', chainId: 369 }]);

    expect(first.observations).toHaveLength(1);
    expect(second.observations).toHaveLength(1);

    expect(first.observations[0].provider).toBe('fixture-deterministic');
    expect(first.observations[0].metadata.providerName).toBe('Deterministic Fixture Provider');
    expect(first.observations[0].metadata.providerSource).toBe('test-fixture');

    expect(second.observations[0].provider).toBe('fixture-deterministic');
    expect(second.observations[0].metadata.providerName).toBe('Deterministic Fixture Provider');
    expect(second.observations[0].metadata.providerSource).toBe('test-fixture');

    expect(first).toEqual(second);
    expect(adapter.metadata.id).toBe('fixture-deterministic');
    expect(adapter.metadata.displayName).toBe('Deterministic Fixture Provider');
    expect(adapter.metadata.source).toBe('test-fixture');
  });
});
