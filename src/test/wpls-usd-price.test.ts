import { describe, expect, it } from 'vitest';

import {
  BRIDGED_DAI_ASSET_ID,
  BRIDGED_USDC_ASSET_ID,
  BRIDGED_USDT_ASSET_ID,
  FORK_COPY_DAI_ASSET_ID,
  FORK_COPY_USDC_ASSET_ID,
  FORK_COPY_USDT_ASSET_ID,
  deriveWplsUsdFromQuotePools,
  unavailableWplsDerivedPrices,
  valueInAsset,
} from '../services/pricing/wpls-usd-price';

describe('deriveWplsUsdFromQuotePools', () => {
  const pusdcAssetId = BRIDGED_USDC_ASSET_ID;

  it('keeps every eligible bridged anchor distinct from its PulseChain fork copy', () => {
    expect(BRIDGED_USDC_ASSET_ID).not.toBe(FORK_COPY_USDC_ASSET_ID);
    expect(BRIDGED_USDT_ASSET_ID).not.toBe(FORK_COPY_USDT_ASSET_ID);
    expect(BRIDGED_DAI_ASSET_ID).not.toBe(FORK_COPY_DAI_ASSET_ID);
  });

  it.each([FORK_COPY_USDC_ASSET_ID, FORK_COPY_USDT_ASSET_ID, FORK_COPY_DAI_ASSET_ID])(
    'does not grant USD-anchor eligibility to fork-copy identity %s',
    (forkCopyAssetId) => {
      expect(deriveWplsUsdFromQuotePools([{
        quoteAssetId: forkCopyAssetId,
        quoteReserveRaw: 1_000_000n,
        quoteDecimals: 6,
        wplsReserveRaw: 10_000n * 10n ** 18n,
        externalUsdObservation: {
          assetId: forkCopyAssetId,
          chainId: 369,
          priceUsd: 1,
          observedAt: '2026-08-31T12:00:00.000Z',
          staleAfter: '2026-08-31T12:05:00.000Z',
          sourcePairAddress: '0x1111111111111111111111111111111111111111',
        },
        excludedSourcePairAddresses: [],
      }], Date.parse('2026-08-31T12:01:00.000Z'))).toBeNull();
    },
  );

  it('uses the external exact-asset quote price instead of forcing the quote asset to one dollar', () => {
    const result = deriveWplsUsdFromQuotePools([
      {
        quoteAssetId: pusdcAssetId,
        quoteReserveRaw: 2_000_000_000n,
        quoteDecimals: 6,
        wplsReserveRaw: 10_000_000n * 10n ** 18n,
        externalUsdObservation: {
          assetId: pusdcAssetId,
          chainId: 369,
          priceUsd: 0.97,
          observedAt: '2026-08-31T12:00:00.000Z',
          staleAfter: '2026-08-31T12:05:00.000Z',
          sourcePairAddress: '0x1111111111111111111111111111111111111111',
        },
        excludedSourcePairAddresses: ['0x6753560538eca67617a9ce605178f788be7e524e'],
      },
    ], Date.parse('2026-08-31T12:01:00.000Z'));

    // 2,000 pUSDC / 10,000,000 WPLS = 0.0002 pUSDC per WPLS.
    // 0.0002 * $0.97 = $0.000194 per WPLS.
    expect(result).toEqual({
      priceUsd: 0.000194,
      quoteAssetId: pusdcAssetId,
      quoteAssetPriceUsd: 0.97,
      observedAt: '2026-08-31T12:00:00.000Z',
      staleAfter: '2026-08-31T12:05:00.000Z',
    });
    expect(result?.priceUsd).not.toBe(0.0002);
  });

  it('rejects an observation sourced from the same WPLS oracle pool', () => {
    expect(deriveWplsUsdFromQuotePools([{
      quoteAssetId: pusdcAssetId,
      quoteReserveRaw: 2_000_000_000n,
      quoteDecimals: 6,
      wplsReserveRaw: 10_000_000n * 10n ** 18n,
      excludedSourcePairAddresses: ['0x6753560538eca67617a9ce605178f788be7e524e'],
      externalUsdObservation: {
        assetId: pusdcAssetId,
        chainId: 369,
        priceUsd: 0.73,
        observedAt: '2026-08-31T12:00:00.000Z',
        staleAfter: '2026-08-31T12:05:00.000Z',
        sourcePairAddress: '0x6753560538eca67617a9ce605178f788be7e524e',
      },
    }], Date.parse('2026-08-31T12:01:00.000Z'))).toBeNull();
  });

  it.each([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1])(
    'rejects invalid quote decimals %s',
    (quoteDecimals) => {
      expect(deriveWplsUsdFromQuotePools([{
        quoteAssetId: pusdcAssetId,
        quoteReserveRaw: 2_000_000_000n,
        quoteDecimals,
        wplsReserveRaw: 10_000_000n * 10n ** 18n,
        excludedSourcePairAddresses: [],
        externalUsdObservation: {
          assetId: pusdcAssetId,
          chainId: 369,
          priceUsd: 0.73,
          observedAt: '2026-08-31T12:00:00.000Z',
          staleAfter: '2026-08-31T12:05:00.000Z',
          sourcePairAddress: '0x1111111111111111111111111111111111111111',
        },
      }], Date.parse('2026-08-31T12:01:00.000Z'))).toBeNull();
    },
  );

  it('fails closed when the exact quote asset has no qualified external USD observation', () => {
    expect(deriveWplsUsdFromQuotePools([
      {
        quoteAssetId: pusdcAssetId,
        quoteReserveRaw: 2_000_000_000n,
        quoteDecimals: 6,
        wplsReserveRaw: 10_000_000n * 10n ** 18n,
        externalUsdObservation: null,
        excludedSourcePairAddresses: ['0x6753560538eca67617a9ce605178f788be7e524e'],
      },
    ])).toBeNull();
  });

  it('supports USDC, USDT, and reversed raw DAI pairs after reserve orientation is normalized', () => {
    const observedAt = '2026-08-31T12:00:00.000Z';
    const staleAfter = '2026-08-31T12:05:00.000Z';
    const quote = (assetId: string, priceUsd: number) => ({
      assetId, chainId: 369, priceUsd, observedAt, staleAfter,
      sourcePairAddress: '0x1111111111111111111111111111111111111111',
    });

    const pools = [
      {
        quoteAssetId: BRIDGED_USDC_ASSET_ID,
        quoteReserveRaw: 1_000_000n,
        quoteDecimals: 6,
        wplsReserveRaw: 10_000n * 10n ** 18n,
        externalUsdObservation: quote(BRIDGED_USDC_ASSET_ID, 0.97),
      },
      {
        quoteAssetId: BRIDGED_USDT_ASSET_ID,
        quoteReserveRaw: 2_000_000n,
        quoteDecimals: 6,
        wplsReserveRaw: 10_000n * 10n ** 18n,
        externalUsdObservation: quote(BRIDGED_USDT_ASSET_ID, 0.96),
      },
      {
        quoteAssetId: BRIDGED_DAI_ASSET_ID,
        // The raw DAI pair is token0=WPLS/token1=DAI; the caller normalizes it
        // by placing token1 in quoteReserveRaw and token0 in wplsReserveRaw.
        quoteReserveRaw: 3n * 10n ** 18n,
        quoteDecimals: 18,
        wplsReserveRaw: 10_000n * 10n ** 18n,
        externalUsdObservation: quote(BRIDGED_DAI_ASSET_ID, 0.95),
      },
    ].map((pool) => ({ ...pool, excludedSourcePairAddresses: [] }));

    const result = deriveWplsUsdFromQuotePools(pools, Date.parse('2026-08-31T12:01:00.000Z'));

    // Quote-side liquidity is $1.92 (USDT), versus $0.97 (USDC) and $2.85 (DAI).
    // DAI therefore wins: 3 DAI / 10,000 WPLS * $0.95 = $0.000285.
    expect(result?.quoteAssetId).toBe(BRIDGED_DAI_ASSET_ID);
    expect(result?.priceUsd).toBeCloseTo(0.000285, 12);
  });

  it('derives WPLS from the exact bridged-USDT candidate', () => {
    const result = deriveWplsUsdFromQuotePools([{
      quoteAssetId: BRIDGED_USDT_ASSET_ID,
      quoteReserveRaw: 5_000_000n,
      quoteDecimals: 6,
      wplsReserveRaw: 20_000n * 10n ** 18n,
      externalUsdObservation: {
        assetId: BRIDGED_USDT_ASSET_ID,
        chainId: 369,
        priceUsd: 0.98,
        observedAt: '2026-08-31T12:00:00.000Z',
        staleAfter: '2026-08-31T12:05:00.000Z',
        sourcePairAddress: '0x1111111111111111111111111111111111111111',
      },
      excludedSourcePairAddresses: [],
    }], Date.parse('2026-08-31T12:01:00.000Z'));

    // 5 USDT / 20,000 WPLS * $0.98 = $0.000245.
    expect(result?.quoteAssetId).toBe(BRIDGED_USDT_ASSET_ID);
    expect(result?.priceUsd).toBeCloseTo(0.000245, 12);
  });

  it('invalidates old WPLS-derived entries without clearing external anchor observations', () => {
    const unavailable = unavailableWplsDerivedPrices();

    const afterFailedRefresh = {
      pulsechain: { usd: 0.0002 },
      'pulsechain:0x95b303987a60c71504d99aa1b13b4da07b0790ab': { usd: 0.01 },
      [`pulsechain:${BRIDGED_USDC_ASSET_ID.split(':').at(-1)}`]: { usd: 0.97, source: 'dexscreener' },
      ...unavailable,
    };

    expect(afterFailedRefresh['pulsechain']).toMatchObject({ usd: 0, status: 'unavailable' });
    expect(unavailable['pulsechain:0xa1077a294dde1b09bb078844df40758a5d0f9a27']).toMatchObject({ usd: 0, status: 'unavailable' });
    expect(afterFailedRefresh['pulsechain:0x95b303987a60c71504d99aa1b13b4da07b0790ab']).toMatchObject({ usd: 0, status: 'unavailable' });
    expect(unavailable[`pulsechain:${BRIDGED_DAI_ASSET_ID.split(':').at(-1)}`]).toMatchObject({ usd: 0, status: 'unavailable' });
    expect(afterFailedRefresh[`pulsechain:${BRIDGED_USDC_ASSET_ID.split(':').at(-1)}`]).toEqual({ usd: 0.97, source: 'dexscreener' });
    expect(unavailable).not.toHaveProperty(`pulsechain:${BRIDGED_USDC_ASSET_ID.split(':').at(-1)}`);
    expect(unavailable).not.toHaveProperty(`pulsechain:${BRIDGED_USDT_ASSET_ID.split(':').at(-1)}`);
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    'returns zero rather than non-finite arithmetic for unavailable price %s',
    (price) => expect(valueInAsset(100, price)).toBe(0),
  );
});
