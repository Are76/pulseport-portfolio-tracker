export type IndependentUsdQuote = {
  assetId: string;
  chainId: number;
  priceUsd: number;
  observedAt: string;
  staleAfter: string;
};

export type WplsQuotePool = {
  quoteAssetId: string;
  quoteReserveRaw: bigint;
  quoteDecimals: number;
  wplsReserveRaw: bigint;
  quoteUsd: IndependentUsdQuote | null;
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
    const quote = pool.quoteUsd;
    const observedAtMs = quote ? Date.parse(quote.observedAt) : Number.NaN;
    const staleAfterMs = quote ? Date.parse(quote.staleAfter) : Number.NaN;
    if (
      !quote
      || quote.assetId !== pool.quoteAssetId
      || quote.chainId !== 369
      || !Number.isFinite(quote.priceUsd)
      || quote.priceUsd <= 0
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
