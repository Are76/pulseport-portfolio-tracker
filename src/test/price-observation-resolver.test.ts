import { describe, expect, it } from 'vitest';

import { resolvePriceObservation, type PersistedPriceObservation } from '../server/portfolio/price-observation-resolver';

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
    ingestedAt: '2026-05-25T00:01:00.000Z',
    metadata: {},
    ...overrides,
  };
}

describe('price observation resolver', () => {
  it('is deterministic for identical inputs', () => {
    const inputs = [
      makeObservation({ observationId: 'obs-a', source: { provider: 'rpc-a', kind: 'rpc', priority: 20, feed: 'a' } }),
      makeObservation({ observationId: 'obs-b', source: { provider: 'rpc-b', kind: 'rpc', priority: 10, feed: 'b' } }),
    ];

    const first = resolvePriceObservation('erc20:369:0xabc', 369, inputs, '2026-05-25T00:30:00.000Z');
    const second = resolvePriceObservation('erc20:369:0xabc', 369, inputs, '2026-05-25T00:30:00.000Z');

    expect(first).toEqual(second);
    expect(first.provenance.selectedObservationId).toBe('obs-b');
  });

  it('degrades stale confidence and marks stale status', () => {
    const result = resolvePriceObservation(
      'erc20:369:0xabc',
      369,
      [makeObservation({ confidenceBps: 8000, staleAfter: '2026-05-25T00:00:01.000Z' })],
      '2026-05-25T00:30:00.000Z',
    );

    expect(result.status).toBe('stale');
    expect(result.confidenceBps).toBe(4000);
  });

  it('never substitutes chain identity across mismatched observations', () => {
    const mismatched = makeObservation({ observationId: 'bad-chain', assetId: 'erc20:943:0xabc', chainId: 369 });
    const result = resolvePriceObservation('erc20:943:0xabc', 369, [mismatched], '2026-05-25T00:30:00.000Z');

    expect(result.status).toBe('unavailable');
    expect(result.warnings.some(w => w.includes('resolver refused chain substitution'))).toBe(true);
  });

  it('safely degrades malformed observations', () => {
    const malformed = makeObservation({ observationId: 'bad', priceUsdAtomic: '-1', observedAt: 'invalid-date' });
    const result = resolvePriceObservation('erc20:369:0xabc', 369, [malformed], '2026-05-25T00:30:00.000Z');

    expect(result.status).toBe('unavailable');
    expect(result.selected?.observationId).toBe('bad');
  });

  it('uses deterministic precedence ordering', () => {
    const result = resolvePriceObservation(
      'erc20:369:0xabc',
      369,
      [
        makeObservation({ observationId: 'older-higher-confidence', confidenceBps: 9000, source: { provider: 'a', kind: 'rpc', priority: 5, feed: 'a' }, observedAt: '2026-05-24T00:00:00.000Z' }),
        makeObservation({ observationId: 'newer-lower-confidence', confidenceBps: 7000, source: { provider: 'a', kind: 'rpc', priority: 5, feed: 'a' }, observedAt: '2026-05-25T00:00:00.000Z' }),
      ],
      '2026-05-25T00:30:00.000Z',
    );

    expect(result.selected?.observationId).toBe('older-higher-confidence');
    expect(result.provenance.evaluatedObservationIds).toEqual(['older-higher-confidence', 'newer-lower-confidence']);
  });
});
