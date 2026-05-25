import { createHash } from 'node:crypto';

import type { ObservationSourceKind, PersistedPriceObservationDto } from './valuation-types';

export type UpstreamPriceObservationInput = {
  provider: string;
  providerObservationId: string;
  sourceKind: ObservationSourceKind;
  sourcePriority: number;
  sourceFeed: string;
  providerAssetId: string;
  assetId: string;
  chainId: number;
  observedAt: string;
  staleAfter: string;
  ingestedAt: string;
  priceUsdAtomic: string | bigint | null;
  confidenceBps: number | null;
  metadata: Record<string, string>;
};

export type NormalizedPriceObservation = {
  status: 'available' | 'degraded' | 'unavailable';
  observation: PersistedPriceObservationDto | null;
  warnings: string[];
  provenance: {
    provider: string;
    providerObservationId: string;
    providerAssetId: string;
    metadata: Record<string, string>;
  };
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

  if (
    date.getUTCFullYear() !== Number(yearRaw)
    || date.getUTCMonth() + 1 !== Number(monthRaw)
    || date.getUTCDate() !== Number(dayRaw)
    || date.getUTCHours() !== Number(hourRaw)
    || date.getUTCMinutes() !== Number(minuteRaw)
    || date.getUTCSeconds() !== Number(secondRaw)
    || date.getUTCMilliseconds() !== (millisecondRaw === undefined ? 0 : Number(millisecondRaw))
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
  if (!Number.isSafeInteger(chainId) || chainId < 0) return null;

  return chainId;
}

function normalizePriceAtomic(value: string | bigint | null): string | null {
  if (value === null) return null;
  if (typeof value === 'bigint') return value < 0n ? null : value.toString();
  return /^\d+$/.test(value) ? value : null;
}

function deterministicMetadata(metadata: Record<string, string>): Record<string, string> {
  const orderedEntries = Object.entries(metadata).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return Object.fromEntries(orderedEntries);
}

function makeObservationId(input: {
  providerObservationId: string;
  assetId: string;
  chainId: number;
  source: { provider: string; kind: ObservationSourceKind; priority: number; feed: string };
  observedAt: string;
  staleAfter: string;
  ingestedAt: string;
  priceUsdAtomic: string | null;
  confidenceBps: number | null;
  metadata: Record<string, string>;
}): string {
  const canonicalIdentityPayload = {
    providerObservationId: input.providerObservationId,
    assetId: input.assetId,
    chainId: input.chainId,
    source: {
      provider: input.source.provider,
      kind: input.source.kind,
      priority: input.source.priority,
      feed: input.source.feed,
    },
    observedAt: input.observedAt,
    staleAfter: input.staleAfter,
    ingestedAt: input.ingestedAt,
    priceUsdAtomic: input.priceUsdAtomic,
    confidenceBps: input.confidenceBps,
    metadata: input.metadata,
  };

  return `obs:${createHash('sha256').update(JSON.stringify(canonicalIdentityPayload)).digest('hex')}`;
}

export function normalizePriceObservation(input: UpstreamPriceObservationInput): NormalizedPriceObservation {
  const warnings: string[] = [];
  const parsedObservedAt = parseStrictUtcIsoOrNull(input.observedAt);
  const parsedStaleAfter = parseStrictUtcIsoOrNull(input.staleAfter);
  const parsedIngestedAt = parseStrictUtcIsoOrNull(input.ingestedAt);

  if (!input.provider.trim()) {
    return { status: 'unavailable', observation: null, warnings: ['Malformed input: provider is required.'], provenance: { provider: input.provider, providerObservationId: input.providerObservationId, providerAssetId: input.providerAssetId, metadata: deterministicMetadata(input.metadata) } };
  }

  if (parsedObservedAt === null || parsedStaleAfter === null || parsedIngestedAt === null) {
    return { status: 'unavailable', observation: null, warnings: ['Malformed input: strict UTC ISO timestamps are required.'], provenance: { provider: input.provider, providerObservationId: input.providerObservationId, providerAssetId: input.providerAssetId, metadata: deterministicMetadata(input.metadata) } };
  }

  if (parsedStaleAfter < parsedObservedAt) {
    return { status: 'unavailable', observation: null, warnings: ['Malformed input: staleAfter must be >= observedAt.'], provenance: { provider: input.provider, providerObservationId: input.providerObservationId, providerAssetId: input.providerAssetId, metadata: deterministicMetadata(input.metadata) } };
  }

  const parsedChainId = parseChainIdFromAssetId(input.assetId);
  if (parsedChainId === null || parsedChainId !== input.chainId) {
    return { status: 'unavailable', observation: null, warnings: ['Malformed input: assetId/chainId mismatch; chain substitution refused.'], provenance: { provider: input.provider, providerObservationId: input.providerObservationId, providerAssetId: input.providerAssetId, metadata: deterministicMetadata(input.metadata) } };
  }

  if (!Number.isSafeInteger(input.sourcePriority) || input.sourcePriority < 0) {
    return { status: 'unavailable', observation: null, warnings: ['Malformed input: sourcePriority must be a safe non-negative integer.'], provenance: { provider: input.provider, providerObservationId: input.providerObservationId, providerAssetId: input.providerAssetId, metadata: deterministicMetadata(input.metadata) } };
  }

  const normalizedPrice = normalizePriceAtomic(input.priceUsdAtomic);
  let status: 'available' | 'degraded' = 'available';
  if (input.priceUsdAtomic !== null && normalizedPrice === null) {
    warnings.push('Degraded input: malformed priceUsdAtomic converted to null.');
    status = 'degraded';
  }

  if (input.confidenceBps !== null && (!Number.isSafeInteger(input.confidenceBps) || input.confidenceBps < 0 || input.confidenceBps > 10_000)) {
    return { status: 'unavailable', observation: null, warnings: ['Malformed input: confidenceBps must be null or safe integer in [0, 10000].'], provenance: { provider: input.provider, providerObservationId: input.providerObservationId, providerAssetId: input.providerAssetId, metadata: deterministicMetadata(input.metadata) } };
  }

  const metadata = deterministicMetadata({
    ...input.metadata,
    providerAssetId: input.providerAssetId,
    providerObservationId: input.providerObservationId,
  });

  const source = {
    provider: input.provider,
    kind: input.sourceKind,
    priority: input.sourcePriority,
    feed: input.sourceFeed,
  };

  const observation: PersistedPriceObservationDto = {
    observationId: makeObservationId({
      providerObservationId: input.providerObservationId,
      assetId: input.assetId,
      chainId: input.chainId,
      source,
      observedAt: input.observedAt,
      staleAfter: input.staleAfter,
      ingestedAt: input.ingestedAt,
      priceUsdAtomic: normalizedPrice,
      confidenceBps: input.confidenceBps,
      metadata,
    }),
    assetId: input.assetId,
    chainId: input.chainId,
    source,
    observedAt: input.observedAt,
    staleAfter: input.staleAfter,
    priceUsdAtomic: normalizedPrice,
    confidenceBps: input.confidenceBps,
    ingestedAt: input.ingestedAt,
    metadata,
  };

  return {
    status,
    observation,
    warnings,
    provenance: {
      provider: input.provider,
      providerObservationId: input.providerObservationId,
      providerAssetId: input.providerAssetId,
      metadata,
    },
  };
}
