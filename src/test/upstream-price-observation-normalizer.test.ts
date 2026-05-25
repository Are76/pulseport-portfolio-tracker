import { describe, expect, it } from 'vitest';

import { createInMemoryPriceObservationRepository } from '../server/portfolio/price-observation-repository';
import { normalizePriceObservation, type UpstreamPriceObservationInput } from '../server/portfolio/upstream-price-observation-normalizer';

function makeInput(overrides: Partial<UpstreamPriceObservationInput> = {}): UpstreamPriceObservationInput {
  return {
    provider: 'upstream-a',
    providerObservationId: 'remote-1',
    sourceKind: 'indexer',
    sourcePriority: 10,
    sourceFeed: 'feed-1',
    providerAssetId: 'remote:abc',
    assetId: 'erc20:369:0xabc',
    chainId: 369,
    observedAt: '2026-05-25T00:00:00.000Z',
    staleAfter: '2026-05-25T01:00:00.000Z',
    ingestedAt: '2026-05-25T00:00:05.000Z',
    priceUsdAtomic: '123450000',
    confidenceBps: 9000,
    metadata: { venue: 'dex-a' },
    ...overrides,
  };
}

describe('upstream price observation normalization', () => {
  it('is deterministic for same upstream input including observationId', () => {
    const input = makeInput();
    const first = normalizePriceObservation(input);
    const second = normalizePriceObservation(input);

    expect(first).toEqual(second);
    expect(first.observation?.observationId).toBe(second.observation?.observationId);
  });

  it('metadata key order does not affect observationId', () => {
    const a = normalizePriceObservation(makeInput({ metadata: { a: '1', b: '2' } }));
    const b = normalizePriceObservation(makeInput({ metadata: { b: '2', a: '1' } }));

    expect(a.observation?.observationId).toBe(b.observation?.observationId);
  });

  it('provider/source values containing delimiters do not collide', () => {
    const a = normalizePriceObservation(makeInput({ provider: 'provider|x', sourceFeed: 'feed=abc|def' }));
    const b = normalizePriceObservation(makeInput({ provider: 'provider', sourceFeed: 'x|feed=abc|def', providerObservationId: 'remote-2' }));

    expect(a.observation?.observationId).not.toBe(b.observation?.observationId);
  });

  it('changing staleAfter changes observationId', () => {
    const a = normalizePriceObservation(makeInput({ staleAfter: '2026-05-25T01:00:00.000Z' }));
    const b = normalizePriceObservation(makeInput({ staleAfter: '2026-05-25T01:00:01.000Z' }));
    expect(a.observation?.observationId).not.toBe(b.observation?.observationId);
  });

  it('changing ingestedAt changes observationId', () => {
    const a = normalizePriceObservation(makeInput({ ingestedAt: '2026-05-25T00:00:05.000Z' }));
    const b = normalizePriceObservation(makeInput({ ingestedAt: '2026-05-25T00:00:06.000Z' }));
    expect(a.observation?.observationId).not.toBe(b.observation?.observationId);
  });

  it('changing source.feed changes observationId', () => {
    const a = normalizePriceObservation(makeInput({ sourceFeed: 'feed-1' }));
    const b = normalizePriceObservation(makeInput({ sourceFeed: 'feed-2' }));
    expect(a.observation?.observationId).not.toBe(b.observation?.observationId);
  });

  it('changing confidenceBps changes observationId', () => {
    const a = normalizePriceObservation(makeInput({ confidenceBps: 9000 }));
    const b = normalizePriceObservation(makeInput({ confidenceBps: 8500 }));
    expect(a.observation?.observationId).not.toBe(b.observation?.observationId);
  });

  it('fails closed on malformed chain-aware identity', () => {
    const result = normalizePriceObservation(makeInput({ assetId: 'erc20:1:0xabc', chainId: 369 }));

    expect(result.status).toBe('unavailable');
    expect(result.observation).toBeNull();
    expect(result.warnings[0]).toContain('chain substitution refused');
  });

  it('fails closed for malformed timestamps', () => {
    const result = normalizePriceObservation(makeInput({ observedAt: '2026/05/25 00:00:00' }));

    expect(result.status).toBe('unavailable');
    expect(result.observation).toBeNull();
  });

  it('degrades malformed price to null and preserves provenance metadata', () => {
    const result = normalizePriceObservation(makeInput({ priceUsdAtomic: '-1' }));

    expect(result.status).toBe('degraded');
    expect(result.observation?.priceUsdAtomic).toBeNull();
    expect(result.provenance.metadata.providerAssetId).toBe('remote:abc');
    expect(result.warnings[0]).toContain('Degraded input');
  });

  it('normalizes bigint price without runtime-dependent behavior', () => {
    const result = normalizePriceObservation(makeInput({ priceUsdAtomic: 123450000n }));

    expect(result.status).toBe('available');
    expect(result.observation?.priceUsdAtomic).toBe('123450000');
  });

  it('integrates with repository using deterministic observation ids without false collision', () => {
    const repo = createInMemoryPriceObservationRepository();

    const normalizedA = normalizePriceObservation(makeInput());
    const normalizedB = normalizePriceObservation(makeInput({ staleAfter: '2026-05-25T01:00:01.000Z' }));

    expect(normalizedA.observation).not.toBeNull();
    expect(normalizedB.observation).not.toBeNull();

    repo.savePriceObservation(normalizedA.observation!);
    repo.savePriceObservation(normalizedB.observation!);

    const stored = repo.getObservationsForAsset('erc20:369:0xabc', 369);
    expect(stored).toHaveLength(2);
  });
});
