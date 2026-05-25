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

function deterministicRequestSort(a: PriceProviderAssetRequest, b: PriceProviderAssetRequest): number {
  if (a.chainId !== b.chainId) return a.chainId - b.chainId;
  return compareStrings(a.assetId, b.assetId);
}

function deterministicProviderSort(a: PriceProviderAdapter, b: PriceProviderAdapter): number {
  return compareStrings(a.metadata.id, b.metadata.id);
}

function deterministicObservationSort(a: UpstreamPriceObservationInput, b: UpstreamPriceObservationInput): number {
  if (a.chainId !== b.chainId) return a.chainId - b.chainId;
  const assetCompare = compareStrings(a.assetId, b.assetId);
  if (assetCompare !== 0) return assetCompare;
  const providerAssetCompare = compareStrings(a.providerAssetId, b.providerAssetId);
  if (providerAssetCompare !== 0) return providerAssetCompare;
  return compareStrings(a.providerObservationId, b.providerObservationId);
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
  const providersInOrder = [...providers].sort(deterministicProviderSort);

  return {
    async execute(requests: PriceProviderAssetRequest[]): Promise<PriceProviderOrchestrationResult> {
      const deterministicRequests = cloneRequests(requests).sort(deterministicRequestSort);
      const providerExecutions: ProviderExecutionSummary[] = [];
      const allIngestionResults: PriceObservationIngestionResult[] = [];
      const unsupportedAssets: Array<PriceProviderUnsupportedAsset & { providerId: string }> = [];
      const warnings: ProviderOrchestrationWarning[] = [];
      const errors: ProviderOrchestrationError[] = [];

      for (const provider of providersInOrder) {
        let batch: PriceProviderObservationBatch;

        try {
          const providerRequests = cloneRequests(deterministicRequests);
          batch = normalizeBatch(await provider.getPriceObservations(providerRequests));
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown provider execution failure.';
          const failure = `Provider execution failure: ${message}`;
          errors.push({ providerId: provider.metadata.id, message: failure });
          providerExecutions.push({
            provider: provider.metadata,
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

        warnings.push(...providerWarnings.map(message => ({ providerId: provider.metadata.id, message })));
        errors.push(...providerErrors.map(message => ({ providerId: provider.metadata.id, message })));

        for (const asset of batch.unsupportedAssets) {
          unsupportedAssets.push({ ...asset, providerId: provider.metadata.id });
        }

        const status: ProviderExecutionStatus = providerErrors.length > 0 ? 'failed' : providerWarnings.length > 0 ? 'partial' : 'success';
        providerExecutions.push({
          provider: provider.metadata,
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
