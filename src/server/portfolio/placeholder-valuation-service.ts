import type { PriceObservationProvider } from './price-observation-provider';
import type {
  AssetValuationDto,
  PortfolioValuationSummaryDto,
  PriceObservationDto,
  ValuationStatus,
} from './valuation-types';

function parseUsableQuantity(quantity: string): number | null {
  const parsed = Number(quantity);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
}

function deriveValuationFromObservation(quantity: string, observation: PriceObservationDto): AssetValuationDto {
  const base = {
    assetId: observation.assetId,
    chainId: observation.chainId,
    symbol: observation.symbol,
    quantity,
    confidence: observation.confidence,
    observation,
    provenance: observation.provenance,
  };

  const warnings = [...observation.warnings];

  if (observation.status === 'available') {
    const hasUsablePrice = typeof observation.priceUsd === 'number' && Number.isFinite(observation.priceUsd);
    const parsedQuantity = parseUsableQuantity(quantity);

    if (hasUsablePrice && parsedQuantity !== null) {
      const usablePriceUsd = observation.priceUsd as number;
      const computedValueUsd = parsedQuantity * usablePriceUsd;
      if (Number.isFinite(computedValueUsd)) {
        return {
          ...base,
          status: 'available',
          valueUsd: computedValueUsd,
          warnings,
        };
      }
    }

    const downgradeReasons: string[] = [];
    if (!hasUsablePrice) {
      downgradeReasons.push('priceUsd was null or non-finite');
    }
    if (parsedQuantity === null) {
      downgradeReasons.push('quantity was malformed or non-finite');
    } else {
      const usablePriceUsd = hasUsablePrice ? (observation.priceUsd as number) : null;
      if (usablePriceUsd !== null && !Number.isFinite(parsedQuantity * usablePriceUsd)) {
        downgradeReasons.push('computed valueUsd was non-finite');
      }
    }

    return {
      ...base,
      status: 'unavailable',
      valueUsd: null,
      warnings: [...warnings, 'Observation reported available status but valuation inputs were unusable.'],
      provenance: {
        ...observation.provenance,
        notes: [
          ...observation.provenance.notes,
          `Available-status observation was downgraded to unavailable because ${downgradeReasons.join(' and ')}.`,
        ],
      },
    };
  }

  const statusMap: Record<Exclude<PriceObservationDto['status'], 'available'>, ValuationStatus> = {
    stale: 'stale',
    unavailable: 'unavailable',
    low_confidence: 'low_confidence',
  };

  return {
    ...base,
    status: statusMap[observation.status],
    valueUsd: null,
    warnings,
  };
}

export function summarizeValuations(valuations: AssetValuationDto[]): PortfolioValuationSummaryDto {
  const valued = valuations.filter((v): v is AssetValuationDto & { valueUsd: number; status: 'available' } => (
    v.status === 'available' && typeof v.valueUsd === 'number' && Number.isFinite(v.valueUsd)
  ));
  const stale = valuations.filter(v => v.status === 'stale');
  const unavailable = valuations.filter(v => v.status === 'unavailable');
  const lowConfidence = valuations.filter(v => v.status === 'low_confidence');

  const status = valuations.length === 0
    ? 'available'
    : unavailable.length === valuations.length
      ? 'unavailable'
      : stale.length > 0 || lowConfidence.length > 0 || unavailable.length > 0
        ? 'partial'
        : 'available';

  return {
    status,
    totalValueUsd: valued.reduce((sum, item) => sum + item.valueUsd, 0),
    valuedAssetCount: valued.length,
    staleAssetCount: stale.length,
    unavailableAssetCount: unavailable.length,
    lowConfidenceAssetCount: lowConfidence.length,
    warnings: valuations.flatMap(item => item.warnings),
  };
}


function parseChainIdFromAssetId(assetId: string): number | null {
  const parts = assetId.split(':');
  if (parts.length < 3) {
    return null;
  }

  const chainIdSegment = parts[1] ?? '';
  if (!/^\d+$/.test(chainIdSegment)) {
    return null;
  }

  const parsed = Number(chainIdSegment);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

function createFallbackObservation(assetId: string): PriceObservationDto {
  const parsedChainId = parseChainIdFromAssetId(assetId);
  const hasParsedChainId = parsedChainId !== null;

  return {
    assetId,
    chainId: parsedChainId ?? -1,
    symbol: 'UNKNOWN',
    source: 'placeholder',
    observedAt: new Date(0).toISOString(),
    priceUsd: null,
    confidence: null,
    staleAfter: new Date(0).toISOString(),
    status: 'unavailable',
    warnings: hasParsedChainId
      ? ['No observation returned for requested assetId.']
      : [
          'No observation returned for requested assetId.',
          'Unable to parse chainId from assetId; using safe unavailable chainId fallback.',
        ],
    provenance: {
      provider: 'placeholder',
      providerAssetId: assetId,
      retrievalMethod: 'placeholder',
      notes: hasParsedChainId
        ? ['Deterministic fallback generated by backend placeholder valuation service.']
        : [
            'Deterministic fallback generated by backend placeholder valuation service.',
            'chainId parse failed from assetId; safe unavailable fallback used instead of assuming 369.',
          ],
    },
  };
}

export class PlaceholderValuationService {
  constructor(private readonly provider: PriceObservationProvider) {}

  async valueAssets(inputs: Array<{ assetId: string; quantity: string }>): Promise<AssetValuationDto[]> {
    const observations = await this.provider.getBatchPriceObservations(inputs.map(input => input.assetId));
    const observationByAssetId = new Map<string, PriceObservationDto>();

    for (const observation of observations) {
      if (!observationByAssetId.has(observation.assetId)) {
        observationByAssetId.set(observation.assetId, observation);
      }
    }

    return inputs.map((input) => {
      const observation = observationByAssetId.get(input.assetId);
      if (!observation) {
        return deriveValuationFromObservation(input.quantity, createFallbackObservation(input.assetId));
      }
      return deriveValuationFromObservation(input.quantity, observation);
    });
  }
}
