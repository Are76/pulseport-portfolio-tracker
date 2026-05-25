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
    return inputs.map(input => ingestPriceObservation(input));
  };

  return { ingestPriceObservation, ingestPriceObservations };
}
