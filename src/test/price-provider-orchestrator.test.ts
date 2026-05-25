import { describe, expect, it, vi } from 'vitest';

import { createPriceObservationIngestionService } from '../server/portfolio/price-observation-ingestion-service';
import { createInMemoryPriceObservationRepository } from '../server/portfolio/price-observation-repository';
import {
  createDeterministicFixturePriceProvider,
  type PriceProviderAdapter,
  type PriceProviderAssetRequest,
} from '../server/portfolio/price-provider-adapter';
import { createPriceProviderOrchestrator } from '../server/portfolio/price-provider-orchestrator';

describe('price provider orchestrator', () => {
  it('executes providers in deterministic order and coordinates ingestion deterministically', async () => {
    const repository = createInMemoryPriceObservationRepository();
    const ingestion = createPriceObservationIngestionService(repository);

    const beta = createDeterministicFixturePriceProvider([
      {
        providerObservationId: 'b-obs-1',
        providerAssetId: 'beta:erc20:369:0xbeef',
        assetId: 'erc20:369:0xbeef',
        chainId: 369,
        observedAt: '2026-05-25T00:05:00.000Z',
        staleAfter: '2026-05-25T01:05:00.000Z',
        ingestedAt: '2026-05-25T00:05:10.000Z',
        priceUsdAtomic: 2000000n,
        confidenceBps: 9100,
        sourceKind: 'indexer',
        sourcePriority: 20,
        sourceFeed: 'beta-feed',
      },
    ]);

    const alpha = createDeterministicFixturePriceProvider([
      {
        providerObservationId: 'a-obs-1',
        providerAssetId: 'alpha:erc20:369:0xabc',
        assetId: 'erc20:369:0xabc',
        chainId: 369,
        observedAt: '2026-05-25T00:00:00.000Z',
        staleAfter: '2026-05-25T01:00:00.000Z',
        ingestedAt: '2026-05-25T00:00:05.000Z',
        priceUsdAtomic: 1000000n,
        confidenceBps: 9500,
        sourceKind: 'indexer',
        sourcePriority: 10,
        sourceFeed: 'alpha-feed',
      },
    ]);

    const providers: PriceProviderAdapter[] = [
      { ...beta, metadata: { ...beta.metadata, id: 'provider-beta', displayName: 'Beta', source: 'fixture' } },
      { ...alpha, metadata: { ...alpha.metadata, id: 'provider-alpha', displayName: 'Alpha', source: 'fixture' } },
    ];

    const orchestrator = createPriceProviderOrchestrator(providers, ingestion);
    const requests: PriceProviderAssetRequest[] = [
      { assetId: 'erc20:369:0xbeef', chainId: 369 },
      { assetId: 'erc20:369:0xabc', chainId: 369 },
    ];

    const result = await orchestrator.execute(requests);

    expect(result.providerOrder).toEqual(['provider-alpha', 'provider-beta']);
    expect(result.requestedAssets).toEqual([
      { assetId: 'erc20:369:0xabc', chainId: 369 },
      { assetId: 'erc20:369:0xbeef', chainId: 369 },
    ]);
    expect(result.providerExecutions.map(item => item.provider.id)).toEqual(['provider-alpha', 'provider-beta']);
    expect(result.ingestionResults).toHaveLength(2);
    expect(repository.getObservationsForAsset('erc20:369:0xabc', 369)).toHaveLength(1);
    expect(repository.getObservationsForAsset('erc20:369:0xbeef', 369)).toHaveLength(1);
  });

  it('isolates provider failures and keeps remaining providers running', async () => {
    const repository = createInMemoryPriceObservationRepository();
    const ingestion = createPriceObservationIngestionService(repository);

    const healthy = {
      metadata: { id: 'healthy-provider', displayName: 'Healthy', source: 'fixture' },
      async getPriceObservations() {
        return {
          observations: [
            {
              provider: 'healthy-provider',
              providerObservationId: 'healthy-1',
              sourceKind: 'indexer' as const,
              sourcePriority: 10,
              sourceFeed: 'healthy-feed',
              providerAssetId: 'healthy:erc20:369:0xaaa',
              assetId: 'erc20:369:0xaaa',
              chainId: 369,
              observedAt: '2026-05-25T00:00:00.000Z',
              staleAfter: '2026-05-25T01:00:00.000Z',
              ingestedAt: '2026-05-25T00:00:01.000Z',
              priceUsdAtomic: 555000n,
              confidenceBps: 9000,
              metadata: {},
            },
          ],
          unsupportedAssets: [],
        };
      },
    } satisfies PriceProviderAdapter;

    const failing = {
      metadata: { id: 'failing-provider', displayName: 'Failing', source: 'fixture' },
      async getPriceObservations() {
        throw new Error('Synthetic provider failure');
      },
    } satisfies PriceProviderAdapter;

    const orchestrator = createPriceProviderOrchestrator([healthy, failing], ingestion);
    const result = await orchestrator.execute([{ assetId: 'erc20:369:0xaaa', chainId: 369 }]);

    expect(result.providerExecutions).toHaveLength(2);
    expect(result.providerExecutions.find(item => item.provider.id === 'failing-provider')?.status).toBe('failed');
    expect(result.providerExecutions.find(item => item.provider.id === 'healthy-provider')?.status).toBe('success');
    expect(result.errors).toEqual([
      {
        providerId: 'failing-provider',
        message: 'Provider execution failure: Synthetic provider failure',
      },
    ]);
    expect(repository.getObservationsForAsset('erc20:369:0xaaa', 369)).toHaveLength(1);
  });

  it('does not compute valuation logic and only handles upstream observations', async () => {
    const repository = createInMemoryPriceObservationRepository();
    const ingestion = createPriceObservationIngestionService(repository);
    const valuationSpy = vi.spyOn(Math, 'max');

    const provider = createDeterministicFixturePriceProvider([
      {
        providerObservationId: 'obs-upstream-only',
        providerAssetId: 'provider:erc20:369:0xabc',
        assetId: 'erc20:369:0xabc',
        chainId: 369,
        observedAt: '2026-05-25T00:10:00.000Z',
        staleAfter: '2026-05-25T01:10:00.000Z',
        ingestedAt: '2026-05-25T00:10:01.000Z',
        priceUsdAtomic: 777000n,
        confidenceBps: 8800,
        sourceKind: 'indexer',
        sourcePriority: 10,
        sourceFeed: 'upstream-only-feed',
      },
    ]);

    const orchestrator = createPriceProviderOrchestrator([provider], ingestion);
    const result = await orchestrator.execute([{ assetId: 'erc20:369:0xabc', chainId: 369 }]);

    expect(result.ingestionResults[0].provenance.provider).toBe('fixture-deterministic');
    expect(repository.getObservationsForAsset('erc20:369:0xabc', 369)).toHaveLength(1);
    expect((result as unknown as Record<string, unknown>).portfolioValueUsdAtomic).toBeUndefined();
    expect((result as unknown as Record<string, unknown>).valuations).toBeUndefined();

    valuationSpy.mockRestore();
  });
});
