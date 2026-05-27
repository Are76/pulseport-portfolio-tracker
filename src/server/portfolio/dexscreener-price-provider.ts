import type { PriceProviderAdapter, PriceProviderAssetRequest, PriceProviderObservationBatch, PriceProviderUnsupportedAsset } from './price-provider-adapter';

const DEXSCREENER_PULSECHAIN_SLUG = 'pulsechain';
const PULSECHAIN_CHAIN_ID = 369;
const ERC20_ASSET_ID_REGEX = /^erc20:(\d+):(0x[a-fA-F0-9]{40})$/;
const FIXED_CONFIDENCE_BPS = 3500;
const STALE_AFTER_WINDOW_MS = 5 * 60 * 1000;
const PRICE_USD_SCALE_DIGITS = 6;
const PRICE_USD_SCALE = 1_000_000n;
const DECIMAL_PATTERN = /^\d+(?:\.\d+)?$/;

export type DexScreenerPriceProviderOptions = {
  fetchImpl?: typeof fetch;
  now?: () => Date;
};

type DexScreenerPair = {
  chainId?: unknown;
  pairAddress?: unknown;
  priceUsd?: unknown;
  url?: unknown;
  liquidity?: { usd?: unknown } | null;
  baseToken?: { address?: unknown } | null;
};

function normalizeAddress(address: string): string {
  return address.toLowerCase();
}

function unsupported(assetId: string, chainId: number, reason: string): PriceProviderUnsupportedAsset {
  return { assetId, chainId, reason };
}

function parsePulsechainAssetId(assetId: string): { chainId: number; contractAddress: string } | null {
  const match = ERC20_ASSET_ID_REGEX.exec(assetId);
  if (!match) return null;
  return {
    chainId: Number(match[1]),
    contractAddress: normalizeAddress(match[2]),
  };
}

function parseStrictPositiveDecimalString(input: unknown): string | null {
  if (typeof input === 'number') {
    if (!Number.isFinite(input) || input <= 0) return null;
    const asString = input.toString();
    if (asString.toLowerCase().includes('e')) return null;
    return parseStrictPositiveDecimalString(asString);
  }

  if (typeof input !== 'string') return null;

  const trimmed = input.trim();
  if (trimmed.length === 0) return null;
  if (!DECIMAL_PATTERN.test(trimmed)) return null;

  const [intPartRaw, fracPartRaw = ''] = trimmed.split('.');
  const intPart = intPartRaw.replace(/^0+(?=\d)/, '');
  const isAllZero = /^0+$/.test(intPart) && (/^0*$/.test(fracPartRaw) || fracPartRaw.length === 0);
  if (isAllZero) return null;

  return fracPartRaw.length > 0 ? `${intPart}.${fracPartRaw}` : intPart;
}

function parsePriceUsdAtomic(priceUsd: unknown): string | null {
  const decimal = parseStrictPositiveDecimalString(priceUsd);
  if (!decimal) return null;

  const [intPart, fracPart = ''] = decimal.split('.');
  const paddedFraction = `${fracPart}${'0'.repeat(PRICE_USD_SCALE_DIGITS)}`.slice(0, PRICE_USD_SCALE_DIGITS);

  const intAtomic = BigInt(intPart) * PRICE_USD_SCALE;
  const fracAtomic = BigInt(paddedFraction);
  const atomic = intAtomic + fracAtomic;

  if (atomic <= 0n) return null;
  return atomic.toString();
}

function parseLiquidityUsd(liquidity: unknown): number | null {
  if (!liquidity || typeof liquidity !== 'object') return 0;
  const usd = (liquidity as { usd?: unknown }).usd;
  if (usd === undefined || usd === null) return 0;

  const decimal = parseStrictPositiveDecimalString(usd);
  if (!decimal) return null;

  const numeric = Number(decimal);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return numeric;
}

function asPairs(payload: unknown): DexScreenerPair[] {
  if (!payload || typeof payload !== 'object') return [];
  const maybePairs = (payload as { pairs?: unknown }).pairs;
  if (!Array.isArray(maybePairs)) return [];
  return maybePairs;
}

function selectBestPair(pairs: DexScreenerPair[], expectedBaseTokenAddress: string): DexScreenerPair | null {
  const baseCandidates = pairs
    .filter((pair) => typeof pair.chainId === 'string' && pair.chainId.toLowerCase() === DEXSCREENER_PULSECHAIN_SLUG)
    .filter((pair) => typeof pair.baseToken?.address === 'string' && normalizeAddress(pair.baseToken.address) === expectedBaseTokenAddress)
    .filter((pair) => parsePriceUsdAtomic(pair.priceUsd) !== null)
    .map((pair) => ({
      pair,
      liquidityUsd: parseLiquidityUsd(pair.liquidity),
      pairAddress: typeof pair.pairAddress === 'string' ? normalizeAddress(pair.pairAddress) : '',
    }))
    .filter((entry) => entry.pairAddress.length > 0);

  if (baseCandidates.length === 0) return null;
  if (baseCandidates.some((entry) => entry.liquidityUsd === null)) return null;

  const candidates = baseCandidates
    .map((entry) => ({ ...entry, liquidityUsd: entry.liquidityUsd as number }))
    .sort((a, b) => {
      if (a.liquidityUsd !== b.liquidityUsd) return b.liquidityUsd - a.liquidityUsd;
      return a.pairAddress.localeCompare(b.pairAddress);
    });

  return candidates[0].pair;
}

export function createDexScreenerPriceProvider(options: DexScreenerPriceProviderOptions = {}): PriceProviderAdapter {
  const fetchImpl = options.fetchImpl ?? fetch;
  const now = options.now ?? (() => new Date());

  return {
    metadata: {
      id: 'dexscreener',
      displayName: 'DexScreener Upstream Provider',
      source: 'upstream-observation',
    },
    async getPriceObservations(requests: PriceProviderAssetRequest[]): Promise<PriceProviderObservationBatch> {
      const observations: PriceProviderObservationBatch['observations'] = [];
      const unsupportedAssets: PriceProviderUnsupportedAsset[] = [];

      for (const request of requests) {
        const parsedAsset = parsePulsechainAssetId(request.assetId);
        if (!parsedAsset || request.chainId !== parsedAsset.chainId) {
          unsupportedAssets.push(unsupported(request.assetId, request.chainId, 'Unsupported assetId format or chain mismatch for DexScreener provider.'));
          continue;
        }
        if (parsedAsset.chainId !== PULSECHAIN_CHAIN_ID || request.chainId !== PULSECHAIN_CHAIN_ID) {
          unsupportedAssets.push(unsupported(request.assetId, request.chainId, 'Unsupported chain for DexScreener provider.'));
          continue;
        }

        const providerAssetId = `token/${DEXSCREENER_PULSECHAIN_SLUG}/${parsedAsset.contractAddress}`;
        const ingestedAt = now().toISOString();

        try {
          const response = await fetchImpl(`https://api.dexscreener.com/latest/dex/tokens/${parsedAsset.contractAddress}`);
          if (!response.ok) {
            unsupportedAssets.push(unsupported(request.assetId, request.chainId, `Upstream unavailable: HTTP ${response.status}.`));
            continue;
          }

          const payload: unknown = await response.json();
          const pairs = asPairs(payload);
          if (pairs.length === 0) {
            unsupportedAssets.push(unsupported(request.assetId, request.chainId, 'No DexScreener pairs available for asset.'));
            continue;
          }

          const selectedPair = selectBestPair(pairs, parsedAsset.contractAddress);
          if (!selectedPair) {
            unsupportedAssets.push(unsupported(request.assetId, request.chainId, 'No supported PulseChain pair with valid price/liquidity.'));
            continue;
          }

          const priceUsdAtomic = parsePriceUsdAtomic(selectedPair.priceUsd);
          if (!priceUsdAtomic) {
            unsupportedAssets.push(unsupported(request.assetId, request.chainId, 'Malformed upstream priceUsd for selected pair.'));
            continue;
          }

          const observedAt = ingestedAt;
          const staleAfter = new Date(Date.parse(observedAt) + STALE_AFTER_WINDOW_MS).toISOString();
          const pairAddress = normalizeAddress(String(selectedPair.pairAddress));
          const sourceFeed = typeof selectedPair.url === 'string' ? selectedPair.url : `pair:${pairAddress}`;

          observations.push({
            provider: 'dexscreener',
            providerAssetId,
            providerObservationId: `dexscreener:${DEXSCREENER_PULSECHAIN_SLUG}:${pairAddress}:${observedAt}`,
            assetId: request.assetId,
            chainId: request.chainId,
            sourceKind: 'indexer',
            sourceFeed,
            sourcePriority: 90,
            observedAt,
            staleAfter,
            ingestedAt,
            priceUsdAtomic,
            confidenceBps: FIXED_CONFIDENCE_BPS,
            metadata: {
              providerName: 'DexScreener Upstream Provider',
              providerSource: 'upstream-observation',
              upstreamChain: DEXSCREENER_PULSECHAIN_SLUG,
              selectedPairAddress: pairAddress,
              selectedPairUrl: typeof selectedPair.url === 'string' ? selectedPair.url : '',
              liquidityUsd: String(parseLiquidityUsd(selectedPair.liquidity)),
            },
          });
        } catch {
          unsupportedAssets.push(unsupported(request.assetId, request.chainId, 'Malformed or unreachable upstream payload.'));
        }
      }

      return { observations, unsupportedAssets };
    },
  };
}
