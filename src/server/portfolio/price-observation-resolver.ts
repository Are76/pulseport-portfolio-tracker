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
  const segments = assetId.split(':');
  if (segments.length !== 3) return null;

  const [prefix, chainSegment, suffix] = segments;
  if (!chainSegment || !/^\d+$/.test(chainSegment) || !suffix) return null;

  const knownPrefix = prefix === 'erc20' || prefix === 'native';
  if (!knownPrefix) return null;

  const parsed = Number(chainSegment);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function parseTimestampOrNull(value: string): number | null {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizePriorityForRanking(priority: number): number {
  if (!Number.isSafeInteger(priority) || priority < 0) {
    return Number.MAX_SAFE_INTEGER;
  }

  return priority;
}

function evaluateCandidate(observation: PersistedPriceObservation, asOfMs: number): Candidate {
  const warnings: string[] = [];
  let malformed = false;

  const parsedObservedAt = parseTimestampOrNull(observation.observedAt);
  const parsedStaleAfter = parseTimestampOrNull(observation.staleAfter);
  const parsedIngestedAt = parseTimestampOrNull(observation.ingestedAt);

  if (parsedObservedAt === null || parsedStaleAfter === null || parsedIngestedAt === null) {
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

  const stale = parsedStaleAfter !== null ? parsedStaleAfter <= asOfMs : true;

  if (!Number.isSafeInteger(observation.source.priority) || observation.source.priority < 0) {
    malformed = true;
    warnings.push('source.priority must be a safe non-negative integer.');
  }

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

  const aPriority = normalizePriorityForRanking(a.observation.source.priority);
  const bPriority = normalizePriorityForRanking(b.observation.source.priority);
  if (aPriority !== bPriority) {
    return aPriority - bPriority;
  }

  const aConfidence = a.confidenceBps ?? -1;
  const bConfidence = b.confidenceBps ?? -1;
  if (aConfidence !== bConfidence) {
    return bConfidence - aConfidence;
  }

  const aObservedAt = parseTimestampOrNull(a.observation.observedAt);
  const bObservedAt = parseTimestampOrNull(b.observation.observedAt);
  if (aObservedAt !== bObservedAt) {
    if (aObservedAt === null) return 1;
    if (bObservedAt === null) return -1;
    return bObservedAt - aObservedAt;
  }

  if (a.observation.observationId === b.observation.observationId) {
    return 0;
  }

  return a.observation.observationId < b.observation.observationId ? -1 : 1;
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
