import type { PersistedPriceObservationDto, PriceObservationStatus } from './valuation-types';

export type PersistedPriceObservation = PersistedPriceObservationDto;

export type ResolvedPriceObservation = {
  selected: PersistedPriceObservation | null;
  status: PriceObservationStatus;
  confidenceBps: number | null;
  warnings: string[];
  provenance: {
    evaluatedObservationIds: string[];
    selectedObservationId: string | null;
    reasoning: string[];
  };
};

type Candidate = {
  observation: PersistedPriceObservation;
  status: PriceObservationStatus;
  confidenceBps: number | null;
  warnings: string[];
  malformed: boolean;
  stale: boolean;
};

function parseChainIdFromAssetId(assetId: string): number | null {
  const [_, chainSegment] = assetId.split(':');
  if (!chainSegment || !/^\d+$/.test(chainSegment)) return null;
  const parsed = Number(chainSegment);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function evaluateCandidate(observation: PersistedPriceObservation, asOfMs: number): Candidate {
  const warnings: string[] = [];
  let malformed = false;

  const parsedObservedAt = Date.parse(observation.observedAt);
  const parsedStaleAfter = Date.parse(observation.staleAfter);
  const parsedIngestedAt = Date.parse(observation.ingestedAt);

  if (!Number.isFinite(parsedObservedAt) || !Number.isFinite(parsedStaleAfter) || !Number.isFinite(parsedIngestedAt)) {
    malformed = true;
    warnings.push('Malformed timestamps detected.');
  }

  const parsedChainId = parseChainIdFromAssetId(observation.assetId);
  if (parsedChainId === null || parsedChainId !== observation.chainId) {
    malformed = true;
    warnings.push('assetId/chainId mismatch; resolver refused chain substitution.');
  }

  const isAtomicPriceValid = observation.priceUsdAtomic !== null && /^\d+$/.test(observation.priceUsdAtomic);
  if (!isAtomicPriceValid) {
    malformed = true;
    warnings.push('priceUsdAtomic must be a non-negative bigint string.');
  }

  const stale = Number.isFinite(parsedStaleAfter) ? parsedStaleAfter <= asOfMs : true;

  let status: PriceObservationStatus = 'available';
  if (malformed) {
    status = 'unavailable';
  } else if (stale) {
    status = 'stale';
  }

  let confidenceBps: number | null = observation.confidenceBps;
  if (confidenceBps !== null && (!Number.isSafeInteger(confidenceBps) || confidenceBps < 0 || confidenceBps > 10_000)) {
    malformed = true;
    status = 'unavailable';
    confidenceBps = null;
    warnings.push('confidenceBps malformed; degraded safely.');
  }

  if (status === 'stale' && confidenceBps !== null) {
    confidenceBps = Math.floor(confidenceBps * 0.5);
    warnings.push('Stale observation confidence was degraded by deterministic factor.');
  }

  if (status === 'available' && confidenceBps !== null && confidenceBps < 4_000) {
    status = 'low_confidence';
    warnings.push('Confidence below deterministic threshold of 4000 bps.');
  }

  return { observation, status, confidenceBps, warnings, malformed, stale };
}

function compareCandidates(a: Candidate, b: Candidate): number {
  const statusRank: Record<PriceObservationStatus, number> = {
    available: 0,
    low_confidence: 1,
    stale: 2,
    unavailable: 3,
  };

  if (statusRank[a.status] !== statusRank[b.status]) {
    return statusRank[a.status] - statusRank[b.status];
  }

  if (a.observation.source.priority !== b.observation.source.priority) {
    return a.observation.source.priority - b.observation.source.priority;
  }

  const aConfidence = a.confidenceBps ?? -1;
  const bConfidence = b.confidenceBps ?? -1;
  if (aConfidence !== bConfidence) {
    return bConfidence - aConfidence;
  }

  const aObservedAt = Date.parse(a.observation.observedAt);
  const bObservedAt = Date.parse(b.observation.observedAt);
  if (aObservedAt !== bObservedAt) {
    return bObservedAt - aObservedAt;
  }

  return a.observation.observationId.localeCompare(b.observation.observationId);
}

export function resolvePriceObservation(
  assetId: string,
  chainId: number,
  observations: PersistedPriceObservation[],
  asOf: string,
): ResolvedPriceObservation {
  const asOfMs = Date.parse(asOf);
  const inScope = observations.filter(obs => obs.assetId === assetId && obs.chainId === chainId);

  if (!Number.isFinite(asOfMs)) {
    return {
      selected: null,
      status: 'unavailable',
      confidenceBps: null,
      warnings: ['asOf timestamp is malformed.'],
      provenance: {
        evaluatedObservationIds: inScope.map(item => item.observationId).sort(),
        selectedObservationId: null,
        reasoning: ['Resolver failed closed due to malformed asOf timestamp.'],
      },
    };
  }

  const evaluated = inScope.map(obs => evaluateCandidate(obs, asOfMs));
  if (evaluated.length === 0) {
    return {
      selected: null,
      status: 'unavailable',
      confidenceBps: null,
      warnings: ['No observations found for assetId/chainId pair.'],
      provenance: { evaluatedObservationIds: [], selectedObservationId: null, reasoning: ['No candidate observations available.'] },
    };
  }

  const ordered = [...evaluated].sort(compareCandidates);
  const winner = ordered[0];

  return {
    selected: winner.observation,
    status: winner.status,
    confidenceBps: winner.confidenceBps,
    warnings: winner.warnings,
    provenance: {
      evaluatedObservationIds: ordered.map(item => item.observation.observationId),
      selectedObservationId: winner.observation.observationId,
      reasoning: [
        'Candidates were filtered by exact assetId and chainId identity.',
        'Candidates were ordered by deterministic status/source/confidence/time/id precedence.',
      ],
    },
  };
}
