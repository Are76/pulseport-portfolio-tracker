export const BRIDGED_USDC_ASSET_ID = 'erc20:369:0x15d38573d2feeb82e7ad5187ab8c1d52810b1f07';
export const BRIDGED_USDT_ASSET_ID = 'erc20:369:0x0cb6f5a34ad42ec934882a05265a7d5f59b51a2f';
export const BRIDGED_DAI_ASSET_ID = 'erc20:369:0xefd766ccb38eaf1dfd701853bfce31359239f305';

export const FORK_COPY_USDC_ASSET_ID = 'erc20:369:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
export const FORK_COPY_USDT_ASSET_ID = 'erc20:369:0xdac17f958d2ee523a2206206994597c13d831ec7';
export const FORK_COPY_DAI_ASSET_ID = 'erc20:369:0x6b175474e89094c44da98b954eedeac495271d0f';

const ELIGIBLE_BRIDGED_USD_ANCHORS = new Set([
  BRIDGED_USDC_ASSET_ID,
  BRIDGED_USDT_ASSET_ID,
  BRIDGED_DAI_ASSET_ID,
]);

export type ExternalUsdObservation = {
  assetId: string;
  chainId: number;
  priceUsd: number;
  observedAt: string;
  staleAfter: string;
  sourcePairAddress: string;
};

export type WplsQuotePool = {
  quoteAssetId: string;
  quoteReserveRaw: bigint;
  quoteDecimals: number;
  wplsReserveRaw: bigint;
  externalUsdObservation: ExternalUsdObservation | null;
  excludedSourcePairAddresses: string[];
};

export type WplsUsdPrice = {
  priceUsd: number;
  quoteAssetId: string;
  quoteAssetPriceUsd: number;
  observedAt: string;
  staleAfter: string;
};

export function deriveWplsUsdFromQuotePools(
  pools: WplsQuotePool[],
  asOfMs = Date.now(),
): WplsUsdPrice | null {
  const candidates = pools.flatMap((pool) => {
    const quote = pool.externalUsdObservation;
    const observedAtMs = quote ? Date.parse(quote.observedAt) : Number.NaN;
    const staleAfterMs = quote ? Date.parse(quote.staleAfter) : Number.NaN;
    if (
      !quote
      || !ELIGIBLE_BRIDGED_USD_ANCHORS.has(pool.quoteAssetId)
      || quote.assetId !== pool.quoteAssetId
      || quote.chainId !== 369
      || !Number.isFinite(quote.priceUsd)
      || quote.priceUsd <= 0
      || !Number.isSafeInteger(pool.quoteDecimals)
      || pool.quoteDecimals < 0
      || pool.excludedSourcePairAddresses.some(
        (address) => address.toLowerCase() === quote.sourcePairAddress.toLowerCase(),
      )
      || !Number.isFinite(observedAtMs)
      || !Number.isFinite(staleAfterMs)
      || observedAtMs > asOfMs
      || staleAfterMs < asOfMs
      || pool.quoteReserveRaw <= 0n
      || pool.wplsReserveRaw <= 0n
    ) {
      return [];
    }

    const quoteReserve = Number(pool.quoteReserveRaw) / 10 ** pool.quoteDecimals;
    const wplsReserve = Number(pool.wplsReserveRaw) / 1e18;
    const priceUsd = (quoteReserve / wplsReserve) * quote.priceUsd;
    if (!Number.isFinite(priceUsd) || priceUsd <= 0) return [];

    return [{
      priceUsd,
      quoteAssetId: pool.quoteAssetId,
      quoteAssetPriceUsd: quote.priceUsd,
      observedAt: quote.observedAt,
      staleAfter: quote.staleAfter,
      quoteLiquidityUsd: quoteReserve * quote.priceUsd,
    }];
  });

  const selected = candidates.sort((a, b) => b.quoteLiquidityUsd - a.quoteLiquidityUsd)[0];
  if (!selected) return null;

  const { quoteLiquidityUsd: _quoteLiquidityUsd, ...result } = selected;
  return result;
}

const WPLS_DERIVED_PRICE_KEYS = [
  'pulsechain',
  'pulsechain:native',
  'pulsechain:0xa1077a294dde1b09bb078844df40758a5d0f9a27', // WPLS
  'pulsechain:0x95b303987a60c71504d99aa1b13b4da07b0790ab', // PLSX
  'pulsechain:0x2fa878ab3f87cc1c9737fc071108f904c0b0c95d', // INC
  'pulsechain:0x2b591e99afe9f32eaa6214f7b7629768c40eeb39', // pHEX
  'pulsechain:hex',
  `pulsechain:${BRIDGED_DAI_ASSET_ID.slice('erc20:369:'.length)}`,
  `pulsechain:${FORK_COPY_DAI_ASSET_ID.slice('erc20:369:'.length)}`,
  'pulsechain:0x02dcdd04e3f455d838cd1249292c58f3b79e3c3c', // bridged WETH
  'pulsechain:0xb17d901469b9208b17d916112988a3fed19b5ca1', // bridged WBTC
  'pulsechain:0xf6f8db0aba00007681f8faf16a0fda1c9b030b11', // PRVX
] as const;

export function unavailableWplsDerivedPrices(): Record<string, Record<string, unknown>> {
  return Object.fromEntries(WPLS_DERIVED_PRICE_KEYS.map((key) => [key, {
    usd: 0,
    status: 'unavailable',
    reason: 'qualified-usd-anchor-unavailable',
  }]));
}

export function valueInAsset(valueUsd: number, assetPriceUsd: number): number {
  if (!Number.isFinite(valueUsd) || !Number.isFinite(assetPriceUsd) || assetPriceUsd <= 0) return 0;
  return valueUsd / assetPriceUsd;
}
