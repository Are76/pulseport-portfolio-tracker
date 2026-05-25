import type { PriceObservationIngestionResult, PriceObservationIngestionService } from './price-observation-ingestion-service';
import type {
  PriceProviderAdapter,
  PriceProviderAssetRequest,
  PriceProviderMetadata,
  PriceProviderObservationBatch,
  PriceProviderUnsupportedAsset,
} from './price-provider-adapter';
import type { UpstreamPriceObservationInput } from './upstream-price-observation-normalizer';

export type ProviderExecutionStatus = 'success' | 'partial' | 'failed';

export type ProviderObservationIngestionSummary = {
  status: ProviderExecutionStatus;
  total: number;
  success: number;
  degraded: number;
  failed: number;
};

export type ProviderExecutionSummary = {
  provider: PriceProviderMetadata;
  status: ProviderExecutionStatus;
  requestedAssets: PriceProviderAssetRequest[];
  observationCount: number;
  unsupportedAssets: PriceProviderUnsupportedAsset[];
  ingestion: ProviderObservationIngestionSummary;
  warnings: string[];
  errors: string[];
};

export type ProviderOrchestrationWarning = {
  providerId: string;
  message: string;
};

export type ProviderOrchestrationError = {
  providerId: string;
  message: string;
};

export type PriceProviderOrchestrationResult = {
  providerOrder: string[];
  requestedAssets: PriceProviderAssetRequest[];
  providerExecutions: ProviderExecutionSummary[];
  ingestionResults: PriceObservationIngestionResult[];
  unsupportedAssets: Array<PriceProviderUnsupportedAsset & { providerId: string }>;
  warnings: ProviderOrchestrationWarning[];
  errors: ProviderOrchestrationError[];
};

export type PriceProviderOrchestrator = {
  execute(requests: PriceProviderAssetRequest[]): Promise<PriceProviderOrchestrationResult>;
};

function compareStrings(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function compareNullableNumber(a: number | null | undefined, b: number | null | undefined): number {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

function canonicalPriceUsdAtomic(value: string | bigint | null | undefined): string {
  if (typeof value === 'bigint') return value.toString();
  if (typeof value !== 'string') return '';
  try {
    return BigInt(value).toString();
  } catch {
    return value;
  }
}

function canonicalMetadata(metadata: Record<string, string> | null | undefined): string {
  if (!metadata || typeof metadata !== 'object') return '';
  return JSON.stringify(Object.keys(metadata).sort().map(key => [key, metadata[key] ?? '']));
}

function deterministicRequestSort(a: PriceProviderAssetRequest, b: PriceProviderAssetRequest): number {
  if (a.chainId !== b.chainId) return a.chainId - b.chainId;
  return compareStrings(a.assetId, b.assetId);
}

function deterministicProviderSort(a: PriceProviderMetadata, b: PriceProviderMetadata): number {
  return compareStrings(a.id, b.id);
}

function snapshotProviderMetadata(metadata: PriceProviderMetadata): PriceProviderMetadata {
  const snapshot: PriceProviderMetadata = {
    id: metadata.id,
    displayName: metadata.displayName,
    source: metadata.source,
  };
  return Object.freeze(snapshot);
}

function cloneProviderMetadata(metadata: PriceProviderMetadata): PriceProviderMetadata {
  return {
    id: metadata.id,
    displayName: metadata.displayName,
    source: metadata.source,
  };
}

function deterministicObservationSort(a: UpstreamPriceObservationInput, b: UpstreamPriceObservationInput): number {
  const comparisons = [
    compareNullableNumber(a.chainId, b.chainId),
    compareStrings(a.assetId ?? '', b.assetId ?? ''),
    compareStrings(a.providerAssetId ?? '', b.providerAssetId ?? ''),
    compareStrings(a.providerObservationId ?? '', b.providerObservationId ?? ''),
    compareStrings(a.observedAt ?? '', b.observedAt ?? ''),
    compareStrings(a.staleAfter ?? '', b.staleAfter ?? ''),
    compareStrings(a.ingestedAt ?? '', b.ingestedAt ?? ''),
    compareStrings(a.sourceKind ?? '', b.sourceKind ?? ''),
    compareNullableNumber(a.sourcePriority, b.sourcePriority),
    compareStrings(a.sourceFeed ?? '', b.sourceFeed ?? ''),
    compareStrings(canonicalPriceUsdAtomic(a.priceUsdAtomic), canonicalPriceUsdAtomic(b.priceUsdAtomic)),
    compareNullableNumber(a.confidenceBps, b.confidenceBps),
    compareStrings(canonicalMetadata(a.metadata), canonicalMetadata(b.metadata)),
  ];

  for (const comparison of comparisons) {
    if (comparison !== 0) return comparison;
  }
  return 0;
}

function deterministicUnsupportedAssetSort(a: PriceProviderUnsupportedAsset, b: PriceProviderUnsupportedAsset): number {
  if (a.chainId !== b.chainId) return a.chainId - b.chainId;
  const assetCompare = compareStrings(a.assetId, b.assetId);
  if (assetCompare !== 0) return assetCompare;
  return compareStrings(a.reason, b.reason);
}

function summarizeIngestion(results: PriceObservationIngestionResult[]): ProviderObservationIngestionSummary {
  const summary: ProviderObservationIngestionSummary = { status: 'success', total: results.length, success: 0, degraded: 0, failed: 0 };
  for (const result of results) {
    if (result.status === 'success') summary.success += 1;
    else if (result.status === 'degraded') summary.degraded += 1;
    else summary.failed += 1;
  }

  if (summary.failed > 0) summary.status = 'failed';
  else if (summary.degraded > 0) summary.status = 'partial';

  return summary;
}

function cloneRequests(requests: PriceProviderAssetRequest[]): PriceProviderAssetRequest[] {
  return requests.map(request => ({ assetId: request.assetId, chainId: request.chainId }));
}

function normalizeBatch(batch: PriceProviderObservationBatch): PriceProviderObservationBatch {
  return {
    observations: [...batch.observations].sort(deterministicObservationSort),
    unsupportedAssets: [...batch.unsupportedAssets].sort(deterministicUnsupportedAssetSort),
  };
}

export function createPriceProviderOrchestrator(
  providers: PriceProviderAdapter[],
  ingestionService: PriceObservationIngestionService,
): PriceProviderOrchestrator {
  const providersInOrder = providers
    .map(provider => ({ provider, metadata: snapshotProviderMetadata(provider.metadata) }))
    .sort((a, b) => deterministicProviderSort(a.metadata, b.metadata));

  return {
    async execute(requests: PriceProviderAssetRequest[]): Promise<PriceProviderOrchestrationResult> {
      const deterministicRequests = cloneRequests(requests).sort(deterministicRequestSort);
      const providerExecutions: ProviderExecutionSummary[] = [];
      const allIngestionResults: PriceObservationIngestionResult[] = [];
      const unsupportedAssets: Array<PriceProviderUnsupportedAsset & { providerId: string }> = [];
      const warnings: ProviderOrchestrationWarning[] = [];
      const errors: ProviderOrchestrationError[] = [];

      for (const providerEntry of providersInOrder) {
        const { provider, metadata } = providerEntry;
        let batch: PriceProviderObservationBatch;

        try {
          const providerRequests = cloneRequests(deterministicRequests);
          batch = normalizeBatch(await provider.getPriceObservations(providerRequests));
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown provider execution failure.';
          const failure = `Provider execution failure: ${message}`;
          errors.push({ providerId: metadata.id, message: failure });
          providerExecutions.push({
            provider: cloneProviderMetadata(metadata),
            status: 'failed',
            requestedAssets: cloneRequests(deterministicRequests),
            observationCount: 0,
            unsupportedAssets: [],
            ingestion: { status: 'failed', total: 0, success: 0, degraded: 0, failed: 0 },
            warnings: [],
            errors: [failure],
          });
          continue;
        }

        const ingestionResults = ingestionService.ingestPriceObservations(batch.observations);
        allIngestionResults.push(...ingestionResults);

        const ingestionSummary = summarizeIngestion(ingestionResults);
        const providerWarnings = ingestionResults.flatMap(result => result.warnings).map(message => `Ingestion warning: ${message}`);
        providerWarnings.push(...batch.unsupportedAssets.map(asset => `Unsupported asset ${asset.assetId} on chain ${asset.chainId}: ${asset.reason}`));
        providerWarnings.sort(compareStrings);

        const providerErrors = ingestionResults
          .filter(result => result.error !== null)
          .map(result => `Ingestion error: ${result.error as string}`)
          .sort(compareStrings);

        warnings.push(...providerWarnings.map(message => ({ providerId: metadata.id, message })));
        errors.push(...providerErrors.map(message => ({ providerId: metadata.id, message })));

        for (const asset of batch.unsupportedAssets) {
          unsupportedAssets.push({ ...asset, providerId: metadata.id });
        }

        const status: ProviderExecutionStatus = providerErrors.length > 0 ? 'failed' : providerWarnings.length > 0 ? 'partial' : 'success';
        providerExecutions.push({
          provider: cloneProviderMetadata(metadata),
          status,
          requestedAssets: cloneRequests(deterministicRequests),
          observationCount: batch.observations.length,
          unsupportedAssets: [...batch.unsupportedAssets],
          ingestion: ingestionSummary,
          warnings: providerWarnings,
          errors: providerErrors,
        });
      }

      unsupportedAssets.sort((a, b) => {
        const providerCompare = compareStrings(a.providerId, b.providerId);
        if (providerCompare !== 0) return providerCompare;
        return deterministicUnsupportedAssetSort(a, b);
      });

      return {
        providerOrder: providersInOrder.map(provider => provider.metadata.id),
        requestedAssets: cloneRequests(deterministicRequests),
        providerExecutions,
        ingestionResults: allIngestionResults,
        unsupportedAssets,
        warnings: warnings.sort((a, b) => {
          const providerCompare = compareStrings(a.providerId, b.providerId);
          if (providerCompare !== 0) return providerCompare;
          return compareStrings(a.message, b.message);
        }),
        errors: errors.sort((a, b) => {
          const providerCompare = compareStrings(a.providerId, b.providerId);
          if (providerCompare !== 0) return providerCompare;
          return compareStrings(a.message, b.message);
        }),
      };
    },
  };
}
