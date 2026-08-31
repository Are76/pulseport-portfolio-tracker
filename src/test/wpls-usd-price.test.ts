import { describe, expect, it } from 'vitest';

import { deriveWplsUsdFromQuotePools } from '../services/pricing/wpls-usd-price';

describe('deriveWplsUsdFromQuotePools', () => {
  const pusdcAssetId = 'erc20:369:0x15d38573d2feeb82e7ad5187ab8c1d52810b1f07';

  it('uses the independently observed quote price instead of forcing the quote asset to one dollar', () => {
    const result = deriveWplsUsdFromQuotePools([
      {
        quoteAssetId: pusdcAssetId,
        quoteReserveRaw: 2_000_000_000n,
        quoteDecimals: 6,
        wplsReserveRaw: 10_000_000n * 10n ** 18n,
        quoteUsd: {
          assetId: pusdcAssetId,
          chainId: 369,
          priceUsd: 0.73,
          observedAt: '2026-08-31T12:00:00.000Z',
          staleAfter: '2026-08-31T12:05:00.000Z',
          sourcePairAddress: '0x1111111111111111111111111111111111111111',
        },
        excludedSourcePairAddresses: ['0x6753560538eca67617a9ce605178f788be7e524e'],
      },
    ], Date.parse('2026-08-31T12:01:00.000Z'));

    // 2,000 pUSDC / 10,000,000 WPLS = 0.0002 pUSDC per WPLS.
    // 0.0002 * $0.73 = $0.000146 per WPLS.
    expect(result).toEqual({
      priceUsd: 0.000146,
      quoteAssetId: pusdcAssetId,
      quoteAssetPriceUsd: 0.73,
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
      quoteUsd: {
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
        quoteUsd: {
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

  it('fails closed when the exact quote asset has no independent USD observation', () => {
    expect(deriveWplsUsdFromQuotePools([
      {
        quoteAssetId: pusdcAssetId,
        quoteReserveRaw: 2_000_000_000n,
        quoteDecimals: 6,
        wplsReserveRaw: 10_000_000n * 10n ** 18n,
        quoteUsd: null,
        excludedSourcePairAddresses: ['0x6753560538eca67617a9ce605178f788be7e524e'],
      },
    ])).toBeNull();
  });
});
