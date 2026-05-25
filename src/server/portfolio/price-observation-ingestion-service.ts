import type { PriceObservationRepository } from './price-observation-repository';
import { normalizePriceObservation, type UpstreamPriceObservationInput } from './upstream-price-observation-normalizer';

export type PriceObservationIngestionStatus = 'success' | 'degraded' | 'failed';

export type PriceObservationIngestionResult = {
  status: PriceObservationIngestionStatus;
  persistedObservationId: string | null;
  warnings: string[];
  provenance: {
    provider: string;
    providerObservationId: string;
    providerAssetId: string;
    metadata: Record<string, string>;
  };
  error: string | null;
};

export type PriceObservationIngestionService = {
  ingestPriceObservation(input: UpstreamPriceObservationInput): PriceObservationIngestionResult;
  ingestPriceObservations(inputs: UpstreamPriceObservationInput[]): PriceObservationIngestionResult[];
};

function compareStrings(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
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

function deterministicObservationSort(a: UpstreamPriceObservationInput, b: UpstreamPriceObservationInput): number {
  const keyComparisons: number[] = [
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

  for (const comparison of keyComparisons) {
    if (comparison !== 0) return comparison;
  }
  return 0;
}

function safeReadString(valueFactory: () => unknown): string {
  try {
    const value = valueFactory();
    return typeof value === 'string' ? value : '';
  } catch {
    return '';
  }
}

function safeReadMetadata(valueFactory: () => unknown): Record<string, string> {
  try {
    const value = valueFactory();
    if (!value || typeof value !== 'object') return {};

    const metadata: Record<string, string> = {};
    for (const [key, raw] of Object.entries(value)) {
      if (typeof raw === 'string') metadata[key] = raw;
    }
    return metadata;
  } catch {
    return {};
  }
}

export function createPriceObservationIngestionService(repository: PriceObservationRepository): PriceObservationIngestionService {
  const ingestPriceObservation = (input: UpstreamPriceObservationInput): PriceObservationIngestionResult => {
    let normalized;

    try {
      normalized = normalizePriceObservation(input);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown normalization failure.';
      return {
        status: 'failed',
        persistedObservationId: null,
        warnings: [`Normalization failure: ${message}`],
        provenance: {
          provider: safeReadString(() => input.provider),
          providerObservationId: safeReadString(() => input.providerObservationId),
          providerAssetId: safeReadString(() => input.providerAssetId),
          metadata: safeReadMetadata(() => input.metadata),
        },
        error: message,
      };
    }

    if (normalized.status === 'unavailable' || normalized.observation === null) {
      return {
        status: 'failed',
        persistedObservationId: null,
        warnings: [...normalized.warnings],
        provenance: { ...normalized.provenance, metadata: { ...normalized.provenance.metadata } },
        error: 'Malformed critical input; observation not persisted.',
      };
    }

    try {
      const persisted = repository.savePriceObservation(normalized.observation);
      return {
        status: normalized.status === 'available' ? 'success' : 'degraded',
        persistedObservationId: persisted.observationId,
        warnings: [...normalized.warnings],
        provenance: { ...normalized.provenance, metadata: { ...normalized.provenance.metadata } },
        error: null,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown repository persistence failure.';
      return {
        status: 'failed',
        persistedObservationId: null,
        warnings: [...normalized.warnings, `Repository persistence failure: ${message}`],
        provenance: { ...normalized.provenance, metadata: { ...normalized.provenance.metadata } },
        error: message,
      };
    }
  };

  const ingestPriceObservations = (inputs: UpstreamPriceObservationInput[]): PriceObservationIngestionResult[] => {
    return [...inputs]
      .sort(deterministicObservationSort)
      .map(input => ingestPriceObservation(input));
  };

  return { ingestPriceObservation, ingestPriceObservations };
}
