import { describe, expect, it } from 'vitest';

import { createInMemoryPriceObservationRepository, type PersistedPriceObservation } from '../server/portfolio/price-observation-repository';
import { resolvePriceObservation } from '../server/portfolio/price-observation-resolver';

function makeObservation(overrides: Partial<PersistedPriceObservation>): PersistedPriceObservation {
  return {
    observationId: 'obs-1',
    assetId: 'erc20:369:0xabc',
    chainId: 369,
    source: { provider: 'rpc-a', kind: 'rpc', priority: 10, feed: 'pair:abc/usd' },
    observedAt: '2026-05-25T00:00:00.000Z',
    staleAfter: '2026-05-25T01:00:00.000Z',
    priceUsdAtomic: '123456789',
    confidenceBps: 8500,
    ingestedAt: '2026-05-25T00:00:01.000Z',
    metadata: { quoteAssetId: 'erc20:369:0xusd' },
    ...overrides,
  };
}

describe('price observation repository', () => {
  it('persists immutable observations and dedupes deterministic identical payloads', () => {
    const repo = createInMemoryPriceObservationRepository();
    const input = makeObservation({ observationId: 'obs-dedupe' });

    const first = repo.savePriceObservation(input);
    const second = repo.savePriceObservation({ ...input, metadata: { ...input.metadata } });

    expect(first).toEqual(second);
    expect(repo.getObservationsForAsset('erc20:369:0xabc', 369)).toHaveLength(1);
  });

  it('fails closed on malformed identity and bigint mapping', () => {
    const repo = createInMemoryPriceObservationRepository();

    expect(() => repo.savePriceObservation(makeObservation({ assetId: 'erc20:943:0xabc', chainId: 369 }))).toThrow(/chain substitution/);
    expect(() => repo.savePriceObservation(makeObservation({ observationId: 'bad-bigint', priceUsdAtomic: '-1' }))).toThrow(/bigint/);
  });

  it('rejects silent overwrite when same observationId has different payload', () => {
    const repo = createInMemoryPriceObservationRepository();
    repo.savePriceObservation(makeObservation({ observationId: 'obs-collision', priceUsdAtomic: '7' }));

    expect(() => repo.savePriceObservation(makeObservation({ observationId: 'obs-collision', priceUsdAtomic: '8' }))).toThrow(/silent overwrite/);
  });

  it('supports batch save and deterministic ordering by observedAt then ingestedAt then id', () => {
    const repo = createInMemoryPriceObservationRepository();
    repo.savePriceObservations([
      makeObservation({ observationId: 'obs-c', observedAt: '2026-05-25T00:00:00.000Z', ingestedAt: '2026-05-25T00:00:03.000Z' }),
      makeObservation({ observationId: 'obs-a', observedAt: '2026-05-25T00:02:00.000Z', ingestedAt: '2026-05-25T00:00:02.000Z' }),
      makeObservation({ observationId: 'obs-b', observedAt: '2026-05-25T00:02:00.000Z', ingestedAt: '2026-05-25T00:00:01.000Z' }),
    ]);

    const ordered = repo.getObservationsForAsset('erc20:369:0xabc', 369);
    expect(ordered.map(item => item.observationId)).toEqual(['obs-a', 'obs-b', 'obs-c']);
  });

  it('getLatestObservationsForAssets filters by exact assetId + chainId only', () => {
    const repo = createInMemoryPriceObservationRepository();
    repo.savePriceObservations([
      makeObservation({ observationId: 'eth-1', assetId: 'erc20:1:0xabc', chainId: 1 }),
      makeObservation({ observationId: 'pls-1', assetId: 'erc20:369:0xabc', chainId: 369 }),
      makeObservation({ observationId: 'native', assetId: 'native:369:pls', chainId: 369 }),
    ]);

    const latest = repo.getLatestObservationsForAssets([
      { assetId: 'erc20:369:0xabc', chainId: 369 },
      { assetId: 'native:369:pls', chainId: 369 },
    ]);

    expect(latest.map(item => item.observationId)).toEqual(['pls-1', 'native']);
  });

  it('integrates with resolver deterministically with exact identity filtering', () => {
    const repo = createInMemoryPriceObservationRepository();
    repo.savePriceObservations([
      makeObservation({ observationId: 'wrong-chain', assetId: 'erc20:1:0xabc', chainId: 1, source: { provider: 'rpc-x', kind: 'rpc', priority: 1, feed: 'x' } }),
      makeObservation({ observationId: 'good', assetId: 'erc20:369:0xabc', chainId: 369, source: { provider: 'rpc-y', kind: 'rpc', priority: 2, feed: 'y' } }),
    ]);

    const inScope = repo.getObservationsForAsset('erc20:369:0xabc', 369);
    const resolved = resolvePriceObservation('erc20:369:0xabc', 369, inScope, '2026-05-25T00:30:00.000Z');

    expect(resolved.selected?.observationId).toBe('good');
    expect(resolved.provenance.evaluatedObservationIds).toEqual(['good']);
  });
});
