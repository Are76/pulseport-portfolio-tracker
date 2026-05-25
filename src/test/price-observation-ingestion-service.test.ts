import { describe, expect, it } from 'vitest';

import { createPriceObservationIngestionService } from '../server/portfolio/price-observation-ingestion-service';
import { createInMemoryPriceObservationRepository, type PriceObservationRepository } from '../server/portfolio/price-observation-repository';
import type { UpstreamPriceObservationInput } from '../server/portfolio/upstream-price-observation-normalizer';

function makeInput(overrides: Partial<UpstreamPriceObservationInput> = {}): UpstreamPriceObservationInput {
  return {
    provider: 'test-provider',
    providerObservationId: 'remote-1',
    sourceKind: 'rpc',
    sourcePriority: 100,
    sourceFeed: 'feed-primary',
    providerAssetId: 'eth-mainnet-usdc',
    assetId: 'erc20:1:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    chainId: 1,
    observedAt: '2026-05-25T00:00:00.000Z',
    staleAfter: '2026-05-25T00:05:00.000Z',
    ingestedAt: '2026-05-25T00:00:02.000Z',
    priceUsdAtomic: '123450000',
    confidenceBps: 9000,
    metadata: { region: 'us-east-1' },
    ...overrides,
  };
}

describe('price observation ingestion service', () => {
  it('normalizes, persists, and returns success status for valid input', () => {
    const repository = createInMemoryPriceObservationRepository();
    const service = createPriceObservationIngestionService(repository);

    const result = service.ingestPriceObservation(makeInput());

    expect(result.status).toBe('success');
    expect(result.persistedObservationId).toMatch(/^obs:/);
    expect(result.error).toBeNull();

    const persisted = repository.getObservationsForAsset('erc20:1:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', 1);
    expect(persisted).toHaveLength(1);
    expect(persisted[0].observationId).toBe(result.persistedObservationId);
  });

  it('is idempotent for duplicate ingestion payloads', () => {
    const repository = createInMemoryPriceObservationRepository();
    const service = createPriceObservationIngestionService(repository);

    const input = makeInput();
    const first = service.ingestPriceObservation(input);
    const second = service.ingestPriceObservation(input);

    expect(first.status).toBe('success');
    expect(second.status).toBe('success');
    expect(first.persistedObservationId).toBe(second.persistedObservationId);

    const persisted = repository.getObservationsForAsset(input.assetId, input.chainId);
    expect(persisted).toHaveLength(1);
  });

  it('sorts batch by deterministic provider observation identity keys', () => {
    const repository = createInMemoryPriceObservationRepository();
    const service = createPriceObservationIngestionService(repository);

    const inputs = [
      makeInput({ providerObservationId: 'remote-b', observedAt: '2026-05-25T00:00:10.000Z' }),
      makeInput({ providerObservationId: 'remote-a', observedAt: '2026-05-25T00:00:09.000Z' }),
      makeInput({ providerObservationId: 'remote-c', observedAt: '2026-05-25T00:00:11.000Z' }),
    ];

    const results = service.ingestPriceObservations(inputs);

    expect(results.map(result => result.provenance.providerObservationId)).toEqual(['remote-a', 'remote-b', 'remote-c']);
    expect(results.every(result => result.status === 'success')).toBe(true);
  });

  it('sorts duplicate providerObservationId observations deterministically using payload tie-breakers', () => {
    const repository = createInMemoryPriceObservationRepository();
    const service = createPriceObservationIngestionService(repository);

    const duplicateA = makeInput({ providerObservationId: 'dup', metadata: { b: '2', a: '1' }, confidenceBps: null, priceUsdAtomic: '00123' });
    const duplicateB = makeInput({ providerObservationId: 'dup', metadata: { a: '1', b: '3' }, confidenceBps: 10, priceUsdAtomic: '123' });

    const results = service.ingestPriceObservations([duplicateB, duplicateA]);

    expect(results.map(r => r.provenance.metadata.b)).toEqual(['2', '3']);
    expect(results.every(result => result.status === 'success')).toBe(true);
  });

  it('produces identical orchestration results when duplicate observations are reversed', () => {
    const forwardRepository = createInMemoryPriceObservationRepository();
    const reverseRepository = createInMemoryPriceObservationRepository();
    const forwardService = createPriceObservationIngestionService(forwardRepository);
    const reverseService = createPriceObservationIngestionService(reverseRepository);

    const duplicateA = makeInput({ providerObservationId: 'dup-order', metadata: { zone: 'a' }, ingestedAt: '2026-05-25T00:00:01.000Z' });
    const duplicateB = makeInput({ providerObservationId: 'dup-order', metadata: { zone: 'b' }, ingestedAt: '2026-05-25T00:00:02.000Z' });

    const forward = forwardService.ingestPriceObservations([duplicateA, duplicateB]);
    const reverse = reverseService.ingestPriceObservations([duplicateB, duplicateA]);

    expect(forward).toEqual(reverse);
    expect(forwardRepository.getObservationsForAsset(duplicateA.assetId, duplicateA.chainId))
      .toEqual(reverseRepository.getObservationsForAsset(duplicateA.assetId, duplicateA.chainId));
  });

  it('fails closed for malformed critical fields and does not persist', () => {
    const repository = createInMemoryPriceObservationRepository();
    const service = createPriceObservationIngestionService(repository);

    const result = service.ingestPriceObservation(makeInput({ observedAt: '2026/05/25 00:00:00' }));

    expect(result.status).toBe('failed');
    expect(result.persistedObservationId).toBeNull();
    expect(result.error).toMatch(/Malformed critical input/);

    const persisted = repository.getObservationsForAsset('erc20:1:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', 1);
    expect(persisted).toHaveLength(0);
  });

  it('persists degraded observations and preserves warnings/provenance', () => {
    const repository = createInMemoryPriceObservationRepository();
    const service = createPriceObservationIngestionService(repository);

    const result = service.ingestPriceObservation(makeInput({ priceUsdAtomic: '-1' }));

    expect(result.status).toBe('degraded');
    expect(result.persistedObservationId).toMatch(/^obs:/);
    expect(result.warnings.some(warning => warning.includes('Degraded input'))).toBe(true);
    expect(result.provenance.providerAssetId).toBe('eth-mainnet-usdc');

    const persisted = repository.getObservationsForAsset('erc20:1:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', 1);
    expect(persisted).toHaveLength(1);
    expect(persisted[0].priceUsdAtomic).toBeNull();
  });

  it('surfaces repository collision errors explicitly', () => {
    const baseRepository = createInMemoryPriceObservationRepository();
    const failingRepository: PriceObservationRepository = {
      ...baseRepository,
      savePriceObservation: observation => {
        if (observation.metadata.region === 'us-west-2') {
          throw new Error('observationId collision with different payload; repository refused silent overwrite.');
        }
        return baseRepository.savePriceObservation(observation);
      },
    };

    const service = createPriceObservationIngestionService(failingRepository);

    const firstResult = service.ingestPriceObservation(makeInput({ metadata: { region: 'us-east-1' } }));
    const secondResult = service.ingestPriceObservation(makeInput({ metadata: { region: 'us-west-2' } }));

    expect(firstResult.status).toBe('success');
    expect(secondResult.status).toBe('failed');
    expect(secondResult.error).toMatch(/silent overwrite/);
    expect(secondResult.warnings.some(warning => warning.includes('Repository persistence failure'))).toBe(true);
  });


  it('returns failed result when normalization throws and does not persist', () => {
    const repository = createInMemoryPriceObservationRepository();
    const service = createPriceObservationIngestionService(repository);

    const malformedRuntimeInput = Object.create(null) as UpstreamPriceObservationInput;
    Object.assign(malformedRuntimeInput, makeInput());
    Object.defineProperty(malformedRuntimeInput, 'provider', { get: () => { throw new Error('provider getter exploded'); } });
    const result = service.ingestPriceObservation(malformedRuntimeInput);

    expect(result.status).toBe('failed');
    expect(result.persistedObservationId).toBeNull();
    expect(result.error).toBe('provider getter exploded');
    expect(result.warnings.some(warning => warning.includes('Normalization failure'))).toBe(true);
    expect(result.provenance.provider).toBe('');
    expect(result.provenance.providerObservationId).toBe('remote-1');

    const persisted = repository.getObservationsForAsset(makeInput().assetId, makeInput().chainId);
    expect(persisted).toHaveLength(0);
  });

  it('continues batch ingestion after normalization throw and persists later successes', () => {
    const repository = createInMemoryPriceObservationRepository();
    const service = createPriceObservationIngestionService(repository);

    const malformedRuntimeInput = Object.create(null) as UpstreamPriceObservationInput;
    Object.assign(malformedRuntimeInput, makeInput({ providerObservationId: 'broken' }));
    Object.defineProperty(malformedRuntimeInput, 'provider', { get: () => { throw new Error('provider getter exploded'); } });
    const validAfterFailure = makeInput({ providerObservationId: 'remote-after', observedAt: '2026-05-25T00:00:30.000Z' });

    const results = service.ingestPriceObservations([malformedRuntimeInput, validAfterFailure]);

    expect(results).toHaveLength(2);
    expect(results[0].status).toBe('failed');
    expect(results[0].error).toBe('provider getter exploded');
    expect(results[0].warnings.some(warning => warning.includes('Normalization failure'))).toBe(true);
    expect(results[0].provenance.providerObservationId).toBe('broken');

    expect(results[1].status).toBe('success');
    expect(results[1].persistedObservationId).toMatch(/^obs:/);

    const persisted = repository.getObservationsForAsset(validAfterFailure.assetId, validAfterFailure.chainId);
    expect(persisted).toHaveLength(1);
    expect(persisted[0].observationId).toBe(results[1].persistedObservationId);
  });

  it('fails chain substitution attempts and never matches by symbol', () => {
    const repository = createInMemoryPriceObservationRepository();
    const service = createPriceObservationIngestionService(repository);

    const result = service.ingestPriceObservation(
      makeInput({
        assetId: 'erc20:369:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        chainId: 1,
        metadata: { symbol: 'USDC' },
      }),
    );

    expect(result.status).toBe('failed');
    expect(result.warnings.join(' ')).toMatch(/chain substitution refused/);
    expect(repository.getObservationsForAsset('erc20:1:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', 1)).toHaveLength(0);
  });
});
