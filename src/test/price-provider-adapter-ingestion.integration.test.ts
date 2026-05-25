import { describe, expect, it } from 'vitest';

import { createPriceObservationIngestionService } from '../server/portfolio/price-observation-ingestion-service';
import { createInMemoryPriceObservationRepository } from '../server/portfolio/price-observation-repository';
import { createDeterministicFixturePriceProvider } from '../server/portfolio/price-provider-adapter';

describe('adapter to ingestion integration', () => {
  it('ingests deterministic fixture observations while preserving provenance and surfacing unsupported assets', async () => {
    const repository = createInMemoryPriceObservationRepository();
    const ingestion = createPriceObservationIngestionService(repository);
    const adapter = createDeterministicFixturePriceProvider([
      {
        providerObservationId: 'fixture-obs-1',
        providerAssetId: 'fixture:erc20:369:0xabc',
        assetId: 'erc20:369:0xabc',
        chainId: 369,
        observedAt: '2026-05-25T00:00:00.000Z',
        staleAfter: '2026-05-25T01:00:00.000Z',
        ingestedAt: '2026-05-25T00:00:30.000Z',
        priceUsdAtomic: 123450000n,
        confidenceBps: 9900,
        sourceKind: 'indexer',
        sourcePriority: 10,
        sourceFeed: 'pair:pls/usdc',
        metadata: { region: 'lab-a' },
      },
    ]);

    const batch = await adapter.getPriceObservations([
      { assetId: 'erc20:369:0xabc', chainId: 369 },
      { assetId: 'erc20:943:0xabc', chainId: 943 },
    ]);

    expect(batch.unsupportedAssets).toEqual([
      {
        assetId: 'erc20:943:0xabc',
        chainId: 943,
        reason: 'Unsupported asset for deterministic fixture provider.',
      },
    ]);

    const results = ingestion.ingestPriceObservations(batch.observations);
    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('success');
    expect(results[0].error).toBeNull();
    expect(results[0].provenance.provider).toBe('fixture-deterministic');
    expect(results[0].provenance.providerObservationId).toBe('fixture-obs-1');
    expect(results[0].provenance.providerAssetId).toBe('fixture:erc20:369:0xabc');
    expect(results[0].provenance.metadata.providerName).toBe('Deterministic Fixture Provider');
    expect(results[0].provenance.metadata.providerSource).toBe('test-fixture');

    const persisted = repository.getObservationsForAsset("erc20:369:0xabc", 369);
    expect(persisted).toHaveLength(1);
    expect(persisted[0].chainId).toBe(369);
    expect(persisted[0].assetId).toBe('erc20:369:0xabc');
  });
});
