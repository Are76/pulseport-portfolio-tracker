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

  it('rejects unknown assetId prefixes as malformed chain-aware identity', () => {
    const malformedPrefix = makeObservation({ observationId: 'bad-prefix', assetId: 'garbage:369:anything' });
    const result = resolvePriceObservation('garbage:369:anything', 369, [malformedPrefix], '2026-05-25T00:30:00.000Z');

    expect(result.status).toBe('unavailable');
    expect(result.warnings.some(w => w.includes('assetId/chainId mismatch'))).toBe(true);
  });

  it('accepts native chain-aware asset identity', () => {
    const native = makeObservation({ observationId: 'native-ok', assetId: 'native:369:pls' });
    const result = resolvePriceObservation('native:369:pls', 369, [native], '2026-05-25T00:30:00.000Z');

    expect(result.status).toBe('available');
    expect(result.selected?.observationId).toBe('native-ok');
  });

  it('degrades malformed source priority to unavailable', () => {
    const malformedPriority = makeObservation({ observationId: 'bad-priority', source: { provider: 'rpc-a', kind: 'rpc', priority: -1, feed: 'bad' } });
    const result = resolvePriceObservation('erc20:369:0xabc', 369, [malformedPriority], '2026-05-25T00:30:00.000Z');

    expect(result.status).toBe('unavailable');
    expect(result.warnings).toContain('source.priority must be a safe non-negative integer.');
  });

  it('valid priority wins over worse valid priority when statuses are equal', () => {
    const result = resolvePriceObservation(
      'erc20:369:0xabc',
      369,
      [
        makeObservation({ observationId: 'priority-50', source: { provider: 'rpc-a', kind: 'rpc', priority: 50, feed: 'a' } }),
        makeObservation({ observationId: 'priority-10', source: { provider: 'rpc-b', kind: 'rpc', priority: 10, feed: 'b' } }),
      ],
      '2026-05-25T00:30:00.000Z',
    );

    expect(result.status).toBe('available');
    expect(result.selected?.observationId).toBe('priority-10');
  });

  it('invalid priority sorts after valid priority', () => {
    const result = resolvePriceObservation(
      'erc20:369:0xabc',
      369,
      [
        makeObservation({ observationId: 'invalid-priority', source: { provider: 'rpc-a', kind: 'rpc', priority: Number.NaN, feed: 'a' } }),
        makeObservation({ observationId: 'valid-priority', source: { provider: 'rpc-b', kind: 'rpc', priority: 25, feed: 'b' } }),
      ],
      '2026-05-25T00:30:00.000Z',
    );

    expect(result.status).toBe('available');
    expect(result.selected?.observationId).toBe('valid-priority');
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

  it('status precedence is deterministic: available > low_confidence > stale > unavailable', () => {
    const result = resolvePriceObservation(
      'erc20:369:0xabc',
      369,
      [
        makeObservation({ observationId: 'available', confidenceBps: 9000, staleAfter: '2026-05-25T02:00:00.000Z' }),
        makeObservation({ observationId: 'low-conf', confidenceBps: 2000, staleAfter: '2026-05-25T02:00:00.000Z' }),
        makeObservation({ observationId: 'stale', confidenceBps: 9000, staleAfter: '2026-05-24T02:00:00.000Z' }),
        makeObservation({ observationId: 'unavailable', priceUsdAtomic: null }),
      ],
      '2026-05-25T00:30:00.000Z',
    );

    expect(result.status).toBe('available');
    expect(result.selected?.observationId).toBe('available');
    expect(result.provenance.reasoning[1]).toContain('deterministic status/source/confidence/time/id precedence');
  });

  it('falls back deterministically when observedAt timestamps are malformed', () => {
    const result = resolvePriceObservation(
      'erc20:369:0xabc',
      369,
      [
        makeObservation({ observationId: 'obs-b', observedAt: 'not-a-date' }),
        makeObservation({ observationId: 'obs-a', observedAt: 'still-not-a-date' }),
      ],
      '2026-05-25T00:30:00.000Z',
    );

    expect(result.status).toBe('unavailable');
    expect(result.selected?.observationId).toBe('obs-a');
    expect(result.provenance.evaluatedObservationIds).toEqual(['obs-a', 'obs-b']);
  });

  it('deterministically orders malformed priority candidates by observationId tie-break', () => {
    const result = resolvePriceObservation(
      'erc20:369:0xabc',
      369,
      [
        makeObservation({ observationId: 'z-id', source: { provider: 'rpc-a', kind: 'rpc', priority: Number.POSITIVE_INFINITY, feed: 'a' } }),
        makeObservation({ observationId: 'a-id', source: { provider: 'rpc-b', kind: 'rpc', priority: Number.NaN, feed: 'b' } }),
      ],
      '2026-05-25T00:30:00.000Z',
    );

    expect(result.status).toBe('unavailable');
    expect(result.selected?.observationId).toBe('a-id');
    expect(result.provenance.evaluatedObservationIds).toEqual(['a-id', 'z-id']);
  });

  it('observationId tie-break is deterministic when all other ranks are equal', () => {
    const result = resolvePriceObservation(
      'erc20:369:0xabc',
      369,
      [
        makeObservation({ observationId: 'obs-z', source: { provider: 'rpc-a', kind: 'rpc', priority: 10, feed: 'a' }, confidenceBps: 8500, observedAt: '2026-05-25T00:00:00.000Z' }),
        makeObservation({ observationId: 'obs-a', source: { provider: 'rpc-b', kind: 'rpc', priority: 10, feed: 'b' }, confidenceBps: 8500, observedAt: '2026-05-25T00:00:00.000Z' }),
      ],
      '2026-05-25T00:30:00.000Z',
    );

    expect(result.status).toBe('available');
    expect(result.selected?.observationId).toBe('obs-a');
    expect(result.provenance.evaluatedObservationIds).toEqual(['obs-a', 'obs-z']);
  });
});
