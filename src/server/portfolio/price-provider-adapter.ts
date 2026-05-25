import type { ObservationSourceKind } from './valuation-types';
import type { UpstreamPriceObservationInput } from './upstream-price-observation-normalizer';

export type PriceProviderMetadata = {
  id: string;
  displayName: string;
  source: string;
};

export type PriceProviderAssetRequest = {
  assetId: string;
  chainId: number;
};

export type PriceProviderUnsupportedAsset = {
  assetId: string;
  chainId: number;
  reason: string;
};

export type PriceProviderObservationBatch = {
  observations: UpstreamPriceObservationInput[];
  unsupportedAssets: PriceProviderUnsupportedAsset[];
};

export type PriceProviderAdapter = {
  readonly metadata: PriceProviderMetadata;
  getPriceObservations(requests: PriceProviderAssetRequest[]): Promise<PriceProviderObservationBatch>;
};

export type FixtureProviderRecord = {
  providerObservationId: string;
  providerAssetId: string;
  assetId: string;
  chainId: number;
  observedAt: string;
  staleAfter: string;
  ingestedAt: string;
  priceUsdAtomic: string | bigint | null;
  confidenceBps: number | null;
  sourceKind: ObservationSourceKind;
  sourcePriority: number;
  sourceFeed: string;
  metadata?: Record<string, string>;
};

function deterministicMetadata(metadata: Record<string, string> | undefined): Record<string, string> {
  if (!metadata) return {};
  return Object.fromEntries(Object.entries(metadata).sort(([a], [b]) => a.localeCompare(b)));
}

function toKey(input: { assetId: string; chainId: number }): string {
  return `${input.assetId}::${input.chainId}`;
}

export function createDeterministicFixturePriceProvider(records: FixtureProviderRecord[]): PriceProviderAdapter {
  const metadata: PriceProviderMetadata = {
    id: 'fixture-deterministic',
    displayName: 'Deterministic Fixture Provider',
    source: 'test-fixture',
  };

  const byAsset = new Map<string, FixtureProviderRecord>();
  for (const record of records) {
    byAsset.set(toKey({ assetId: record.assetId, chainId: record.chainId }), record);
  }

  return {
    metadata,
    async getPriceObservations(requests: PriceProviderAssetRequest[]): Promise<PriceProviderObservationBatch> {
      const observations: UpstreamPriceObservationInput[] = [];
      const unsupportedAssets: PriceProviderUnsupportedAsset[] = [];

      for (const request of requests) {
        const match = byAsset.get(toKey(request));
        if (!match) {
          unsupportedAssets.push({
            assetId: request.assetId,
            chainId: request.chainId,
            reason: 'Unsupported asset for deterministic fixture provider.',
          });
          continue;
        }

        observations.push({
          provider: metadata.id,
          providerObservationId: match.providerObservationId,
          sourceKind: match.sourceKind,
          sourcePriority: match.sourcePriority,
          sourceFeed: match.sourceFeed,
          providerAssetId: match.providerAssetId,
          assetId: match.assetId,
          chainId: match.chainId,
          observedAt: match.observedAt,
          staleAfter: match.staleAfter,
          ingestedAt: match.ingestedAt,
          priceUsdAtomic: match.priceUsdAtomic,
          confidenceBps: match.confidenceBps,
          metadata: deterministicMetadata({
            providerName: metadata.displayName,
            providerSource: metadata.source,
            ...(match.metadata ?? {}),
          }),
        });
      }

      return { observations, unsupportedAssets };
    },
  };
}
