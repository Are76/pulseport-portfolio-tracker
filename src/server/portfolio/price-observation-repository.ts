import type { PersistedPriceObservationDto } from './valuation-types';

export type PersistedPriceObservation = PersistedPriceObservationDto;

export type PriceObservationRepository = {
  savePriceObservation(observation: PersistedPriceObservation): PersistedPriceObservation;
  savePriceObservations(observations: PersistedPriceObservation[]): PersistedPriceObservation[];
  getObservationsForAsset(assetId: string, chainId: number): PersistedPriceObservation[];
  getLatestObservationsForAssets(assetKeys: Array<{ assetId: string; chainId: number }>): PersistedPriceObservation[];
};

const STRICT_UTC_ISO_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{3}))?Z$/;
const KNOWN_ASSET_PREFIXES = new Set(['erc20', 'native']);

function parseStrictUtcIsoOrNull(value: string): number | null {
  const match = STRICT_UTC_ISO_PATTERN.exec(value);
  if (!match) return null;

  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return null;

  const [, yearRaw, monthRaw, dayRaw, hourRaw, minuteRaw, secondRaw, millisecondRaw] = match;
  const date = new Date(parsed);

  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  const second = Number(secondRaw);
  const millisecond = millisecondRaw === undefined ? 0 : Number(millisecondRaw);

  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() + 1 !== month
    || date.getUTCDate() !== day
    || date.getUTCHours() !== hour
    || date.getUTCMinutes() !== minute
    || date.getUTCSeconds() !== second
    || date.getUTCMilliseconds() !== millisecond
  ) {
    return null;
  }

  return parsed;
}

function parseChainIdFromAssetId(assetId: string): number | null {
  const [prefix, chainIdRaw, suffix, ...rest] = assetId.split(':');
  if (!prefix || !chainIdRaw || !suffix || rest.length > 0) return null;
  if (!KNOWN_ASSET_PREFIXES.has(prefix)) return null;
  if (!/^\d+$/.test(chainIdRaw)) return null;

  const chainId = Number(chainIdRaw);
  if (!Number.isSafeInteger(chainId)) return null;

  return chainId;
}

function normalizeAndValidate(observation: PersistedPriceObservation): PersistedPriceObservation {
  if (!observation.observationId.trim()) throw new Error('observationId is required.');
  if (!Number.isSafeInteger(observation.chainId) || observation.chainId < 0) throw new Error('chainId must be a safe non-negative integer.');

  const parsedChainId = parseChainIdFromAssetId(observation.assetId);
  if (parsedChainId === null || parsedChainId !== observation.chainId) {
    throw new Error('assetId/chainId mismatch; repository refused chain substitution.');
  }

  if (parseStrictUtcIsoOrNull(observation.observedAt) === null) throw new Error('observedAt must be strict UTC ISO.');
  if (parseStrictUtcIsoOrNull(observation.staleAfter) === null) throw new Error('staleAfter must be strict UTC ISO.');
  if (parseStrictUtcIsoOrNull(observation.ingestedAt) === null) throw new Error('ingestedAt must be strict UTC ISO.');

  if (observation.priceUsdAtomic !== null && !/^\d+$/.test(observation.priceUsdAtomic)) {
    throw new Error('priceUsdAtomic must be a non-negative bigint string.');
  }

  if (!Number.isSafeInteger(observation.source.priority) || observation.source.priority < 0) {
    throw new Error('source.priority must be a safe non-negative integer.');
  }

  if (observation.confidenceBps !== null && (!Number.isSafeInteger(observation.confidenceBps) || observation.confidenceBps < 0 || observation.confidenceBps > 10_000)) {
    throw new Error('confidenceBps must be null or a safe integer in [0, 10000].');
  }

  return {
    ...observation,
    metadata: { ...observation.metadata },
    source: { ...observation.source },
  };
}

function compareForDeterministicOrdering(a: PersistedPriceObservation, b: PersistedPriceObservation): number {
  const observedAtA = parseStrictUtcIsoOrNull(a.observedAt) ?? Number.MIN_SAFE_INTEGER;
  const observedAtB = parseStrictUtcIsoOrNull(b.observedAt) ?? Number.MIN_SAFE_INTEGER;
  if (observedAtA !== observedAtB) return observedAtB - observedAtA;

  const ingestedAtA = parseStrictUtcIsoOrNull(a.ingestedAt) ?? Number.MIN_SAFE_INTEGER;
  const ingestedAtB = parseStrictUtcIsoOrNull(b.ingestedAt) ?? Number.MIN_SAFE_INTEGER;
  if (ingestedAtA !== ingestedAtB) return ingestedAtB - ingestedAtA;

  if (a.observationId === b.observationId) return 0;
  return a.observationId < b.observationId ? -1 : 1;
}

export function createInMemoryPriceObservationRepository(seed: PersistedPriceObservation[] = []): PriceObservationRepository {
  const storedByObservationId = new Map<string, PersistedPriceObservation>();

  for (const observation of seed) {
    const normalized = normalizeAndValidate(observation);
    if (!storedByObservationId.has(normalized.observationId)) {
      storedByObservationId.set(normalized.observationId, normalized);
    }
  }

  const savePriceObservation = (observation: PersistedPriceObservation): PersistedPriceObservation => {
    const normalized = normalizeAndValidate(observation);
    const existing = storedByObservationId.get(normalized.observationId);

    if (existing) {
      const existingSerialized = JSON.stringify(existing);
      const incomingSerialized = JSON.stringify(normalized);
      if (existingSerialized !== incomingSerialized) {
        throw new Error('observationId collision with different payload; repository refused silent overwrite.');
      }
      return { ...existing, source: { ...existing.source }, metadata: { ...existing.metadata } };
    }

    storedByObservationId.set(normalized.observationId, normalized);
    return { ...normalized, source: { ...normalized.source }, metadata: { ...normalized.metadata } };
  };

  const savePriceObservations = (observations: PersistedPriceObservation[]): PersistedPriceObservation[] => observations.map(savePriceObservation);

  const getObservationsForAsset = (assetId: string, chainId: number): PersistedPriceObservation[] => {
    const filtered = [...storedByObservationId.values()].filter(obs => obs.assetId === assetId && obs.chainId === chainId);
    return filtered.sort(compareForDeterministicOrdering).map(obs => ({ ...obs, source: { ...obs.source }, metadata: { ...obs.metadata } }));
  };

  const getLatestObservationsForAssets = (assetKeys: Array<{ assetId: string; chainId: number }>): PersistedPriceObservation[] => {
    const dedupedKeys = new Map<string, { assetId: string; chainId: number }>();
    for (const key of assetKeys) {
      dedupedKeys.set(`${key.assetId}::${key.chainId}`, key);
    }

    const latest = [...dedupedKeys.values()]
      .map(key => getObservationsForAsset(key.assetId, key.chainId)[0] ?? null)
      .filter((observation): observation is PersistedPriceObservation => observation !== null)
      .sort((a, b) => {
        if (a.assetId !== b.assetId) return a.assetId < b.assetId ? -1 : 1;
        if (a.chainId !== b.chainId) return a.chainId - b.chainId;
        return compareForDeterministicOrdering(a, b);
      });

    return latest;
  };

  return { savePriceObservation, savePriceObservations, getObservationsForAsset, getLatestObservationsForAssets };
}
