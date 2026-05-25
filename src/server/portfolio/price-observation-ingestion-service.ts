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

export function createPriceObservationIngestionService(repository: PriceObservationRepository): PriceObservationIngestionService {
  const ingestPriceObservation = (input: UpstreamPriceObservationInput): PriceObservationIngestionResult => {
    const normalized = normalizePriceObservation(input);

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
