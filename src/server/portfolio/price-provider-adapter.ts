import type { ObservationSourceKind } from './valuation-types';
import type { UpstreamPriceObservationInput } from './upstream-price-observation-normalizer';

export type PriceProviderMetadata = Readonly<{
  id: string;
  displayName: string;
  source: string;
}>;

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

function normalizeFixtureMetadata(metadata: Record<string, string> | undefined): Record<string, string> {
  if (!metadata) return {};

  const reserved = new Set(['providerName', 'providerSource']);
  const filtered: Record<string, string> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (!reserved.has(key)) {
      filtered[key] = value;
    }
  }

  return deterministicMetadata(filtered);
}

function snapshotFixtureRecord(record: FixtureProviderRecord): FixtureProviderRecord {
  return {
    ...record,
    metadata: normalizeFixtureMetadata(record.metadata),
  };
}

export function createDeterministicFixturePriceProvider(records: FixtureProviderRecord[]): PriceProviderAdapter {
  const metadataSnapshot: PriceProviderMetadata = Object.freeze({
    id: 'fixture-deterministic',
    displayName: 'Deterministic Fixture Provider',
    source: 'test-fixture',
  });

  const byAsset = new Map<string, FixtureProviderRecord>();
  for (const record of records) {
    const key = toKey({ assetId: record.assetId, chainId: record.chainId });
    if (byAsset.has(key)) {
      throw new Error(`Duplicate fixture record for assetId/chainId: ${record.assetId}/${record.chainId}`);
    }
    byAsset.set(key, snapshotFixtureRecord(record));
  }

  return {
    metadata: metadataSnapshot,
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
          provider: metadataSnapshot.id,
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
            ...(match.metadata ?? {}),
            providerName: metadataSnapshot.displayName,
            providerSource: metadataSnapshot.source,
          }),
        });
      }

      return { observations, unsupportedAssets };
    },
  };
}
