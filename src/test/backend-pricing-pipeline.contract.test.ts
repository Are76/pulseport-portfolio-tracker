import { describe, expect, it } from 'vitest';

import { createPriceObservationIngestionService } from '../server/portfolio/price-observation-ingestion-service';
import { createInMemoryPriceObservationRepository } from '../server/portfolio/price-observation-repository';
import { resolvePriceObservation } from '../server/portfolio/price-observation-resolver';
import {
  createDeterministicFixturePriceProvider,
  type FixtureProviderRecord,
  type PriceProviderAssetRequest,
} from '../server/portfolio/price-provider-adapter';
import { createPriceProviderOrchestrator } from '../server/portfolio/price-provider-orchestrator';
import type { PriceObservationProvider } from '../server/portfolio/price-observation-provider';
import { PlaceholderValuationService } from '../server/portfolio/placeholder-valuation-service';
import type { PriceObservationDto, PriceObservationStatus } from '../server/portfolio/valuation-types';

const AS_OF = '2026-05-25T00:30:00.000Z';

function makeFixtureRecords(): FixtureProviderRecord[] {
  return [
    {
      providerObservationId: 'fixture-obs-supported-1',
      providerAssetId: 'fixture:erc20:369:0xabc',
      assetId: 'erc20:369:0xabc',
      chainId: 369,
      observedAt: '2026-05-25T00:10:00.000Z',
      staleAfter: '2026-05-25T01:10:00.000Z',
      ingestedAt: '2026-05-25T00:10:05.000Z',
      priceUsdAtomic: 2500000n,
      confidenceBps: 9800,
      sourceKind: 'indexer',
      sourcePriority: 10,
      sourceFeed: 'fixture-feed:abc/usdc',
      metadata: { region: 'test-lab-a' },
    },
  ];
}

function toPriceObservationDtoFromResolved(
  resolved: ReturnType<typeof resolvePriceObservation>,
  requestedAssetId: string,
  requestedChainId: number,
): PriceObservationDto {
  if (!resolved.selected) {
    return {
      assetId: requestedAssetId,
      chainId: requestedChainId,
      symbol: 'UNKNOWN',
      source: 'resolver',
      observedAt: new Date(0).toISOString(),
      staleAfter: new Date(0).toISOString(),
      priceUsd: null,
      confidence: null,
      status: 'unavailable',
      warnings: [...resolved.warnings],
      provenance: {
        provider: 'resolver',
        providerAssetId: requestedAssetId,
        retrievalMethod: 'placeholder',
        notes: [...resolved.provenance.reasoning],
      },
    };
  }

  const selected = resolved.selected;
  const statusMap: Record<PriceObservationStatus, PriceObservationStatus> = {
    available: 'available',
    stale: 'stale',
    unavailable: 'unavailable',
    low_confidence: 'low_confidence',
  };

  return {
    assetId: selected.assetId,
    chainId: selected.chainId,
    symbol: 'FIXTURE',
    source: selected.source.feed,
    observedAt: selected.observedAt,
    staleAfter: selected.staleAfter,
    priceUsd: selected.priceUsdAtomic === null ? null : Number(selected.priceUsdAtomic) / 1_000_000,
    confidence: resolved.confidenceBps,
    status: statusMap[resolved.status],
    warnings: [...resolved.warnings],
    provenance: {
      provider: selected.source.provider,
      providerAssetId: selected.metadata.providerAssetId ?? selected.assetId,
      retrievalMethod: 'placeholder',
      notes: [...resolved.provenance.reasoning],
    },
  };
}

function makeResolverBackedProvider(repository: ReturnType<typeof createInMemoryPriceObservationRepository>): PriceObservationProvider {
  return {
    async getPriceObservation(assetId: string): Promise<PriceObservationDto> {
      const [_, chainSegment] = assetId.split(':');
      const chainId = Number(chainSegment);
      const observations = repository.getObservationsForAsset(assetId, chainId);
      const resolved = resolvePriceObservation(assetId, chainId, observations, AS_OF);
      return toPriceObservationDtoFromResolved(resolved, assetId, chainId);
    },
    async getBatchPriceObservations(assetIds: string[]): Promise<PriceObservationDto[]> {
      return Promise.all(assetIds.map(assetId => this.getPriceObservation(assetId)));
    },
  };
}

async function runPipeline(requests: PriceProviderAssetRequest[]) {
  const repository = createInMemoryPriceObservationRepository();
  const ingestion = createPriceObservationIngestionService(repository);
  const fixtureProvider = createDeterministicFixturePriceProvider(makeFixtureRecords());
  const orchestrator = createPriceProviderOrchestrator([fixtureProvider], ingestion);

  const adapterBatch = await fixtureProvider.getPriceObservations(requests);
  const orchestration = await orchestrator.execute(requests);
  const resolverBackedProvider = makeResolverBackedProvider(repository);
  const valuationService = new PlaceholderValuationService(resolverBackedProvider);
  const valuations = await valuationService.valueAssets(requests.map(request => ({ assetId: request.assetId, quantity: '2' })));

  return {
    adapterBatch,
    orchestration,
    repository,
    valuations,
  };
}

describe('backend pricing pipeline contract', () => {
  it('proves deterministic provider→orchestrator→ingestion→repository→resolver→valuation flow without live providers', async () => {
    const requests: PriceProviderAssetRequest[] = [
      { assetId: 'erc20:369:0xabc', chainId: 369 },
      { assetId: 'erc20:369:0xdef', chainId: 369 },
    ];

    const first = await runPipeline(requests);

    expect(first.adapterBatch.observations).toHaveLength(1);
    expect(first.adapterBatch.observations[0].provider).toBe('fixture-deterministic');
    expect(first.adapterBatch.unsupportedAssets).toEqual([
      { assetId: 'erc20:369:0xdef', chainId: 369, reason: 'Unsupported asset for deterministic fixture provider.' },
    ]);

    expect(first.orchestration.providerOrder).toEqual(['fixture-deterministic']);
    expect(first.orchestration.providerExecutions[0].ingestion.status).toBe('success');
    expect(first.orchestration.ingestionResults).toHaveLength(1);

    const persisted = first.repository.getObservationsForAsset('erc20:369:0xabc', 369);
    expect(persisted).toHaveLength(1);

    const resolved = resolvePriceObservation('erc20:369:0xabc', 369, persisted, AS_OF);
    expect(resolved.selected?.observationId).toBe(first.orchestration.ingestionResults[0].persistedObservationId);
    expect(resolved.confidenceBps).toBe(9800);

    const supportedValuation = first.valuations.find(item => item.assetId === 'erc20:369:0xabc');
    const unsupportedValuation = first.valuations.find(item => item.assetId === 'erc20:369:0xdef');

    expect(supportedValuation?.status).toBe('available');
    expect(supportedValuation?.valueUsd).toBe(5);
    expect(supportedValuation?.provenance.provider).toBe('fixture-deterministic');
    expect(typeof supportedValuation?.confidence).toBe('number');

    expect(unsupportedValuation?.status).toBe('unavailable');
    expect(unsupportedValuation?.valueUsd).toBeNull();
    expect(unsupportedValuation?.warnings.length).toBeGreaterThan(0);

    const second = await runPipeline(requests);
    expect(second.orchestration).toEqual(first.orchestration);
    expect(second.valuations).toEqual(first.valuations);

    const reversed = await runPipeline([...requests].reverse());
    expect(reversed.orchestration).toEqual(first.orchestration);

    const sortByAsset = <T extends { assetId: string }>(items: T[]): T[] => [...items].sort((a, b) => a.assetId.localeCompare(b.assetId));
    expect(sortByAsset(reversed.valuations)).toEqual(sortByAsset(first.valuations));
  });
});
