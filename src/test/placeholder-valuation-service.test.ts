import { describe, expect, it } from 'vitest';

import type { PriceObservationProvider } from '../server/portfolio/price-observation-provider';
import { PlaceholderValuationService, summarizeValuations } from '../server/portfolio/placeholder-valuation-service';
import type { PortfolioValuationEnvelopeDto, PriceObservationDto } from '../server/portfolio/valuation-types';

function makeObservation(overrides: Partial<PriceObservationDto>): PriceObservationDto {
  return {
    assetId: 'erc20:369:0xabc',
    chainId: 369,
    symbol: 'TKN',
    source: 'placeholder',
    observedAt: '2026-01-01T00:00:00.000Z',
    priceUsd: 2,
    confidence: 0.99,
    staleAfter: '2026-01-02T00:00:00.000Z',
    status: 'available',
    warnings: [],
    provenance: {
      provider: 'placeholder',
      providerAssetId: 'erc20:369:0xabc',
      retrievalMethod: 'placeholder',
      notes: ['contract-test'],
    },
    ...overrides,
  };
}

function makeProvider(observations: PriceObservationDto[]): PriceObservationProvider {
  return {
    getPriceObservation: async (assetId: string) => {
      const match = observations.find(item => item.assetId === assetId);
      if (!match) {
        throw new Error('not found');
      }
      return match;
    },
    getBatchPriceObservations: async () => observations,
  };
}

describe('placeholder valuation service contracts', () => {
  it('returns available valuation with valueUsd populated', async () => {
    const service = new PlaceholderValuationService(makeProvider([makeObservation({ status: 'available', priceUsd: 2 })]));
    const [valuation] = await service.valueAssets([{ assetId: 'erc20:369:0xabc', quantity: '3' }]);

    expect(valuation.status).toBe('available');
    expect(valuation.valueUsd).toBe(6);
    expect(valuation.confidence).toBe(0.99);
  });

  it('returns stale valuation status and null valueUsd', async () => {
    const service = new PlaceholderValuationService(
      makeProvider([makeObservation({ status: 'stale', priceUsd: 2, warnings: ['Observation is stale.'] })]),
    );
    const [valuation] = await service.valueAssets([{ assetId: 'erc20:369:0xabc', quantity: '3' }]);

    expect(valuation.status).toBe('stale');
    expect(valuation.valueUsd).toBeNull();
    expect(valuation.warnings).toContain('Observation is stale.');
  });

  it('returns unavailable valuation status deterministically when provider omits asset', async () => {
    const service = new PlaceholderValuationService(makeProvider([]));
    const [valuation] = await service.valueAssets([{ assetId: 'erc20:369:0xmissing', quantity: '3' }]);

    expect(valuation.assetId).toBe('erc20:369:0xmissing');
    expect(valuation.status).toBe('unavailable');
    expect(valuation.valueUsd).toBeNull();
    expect(valuation.warnings).toContain('No observation returned for requested assetId.');
  });

  it('propagates low-confidence warnings and provenance', async () => {
    const service = new PlaceholderValuationService(
      makeProvider([
        makeObservation({
          status: 'low_confidence',
          confidence: 0.2,
          warnings: ['Price confidence below threshold.'],
          provenance: {
            provider: 'placeholder',
            providerAssetId: 'erc20:369:0xabc',
            retrievalMethod: 'placeholder',
            notes: ['thin liquidity'],
          },
        }),
      ]),
    );
    const [valuation] = await service.valueAssets([{ assetId: 'erc20:369:0xabc', quantity: '3' }]);

    expect(valuation.status).toBe('low_confidence');
    expect(valuation.valueUsd).toBeNull();
    expect(valuation.warnings).toContain('Price confidence below threshold.');
    expect(valuation.provenance.notes).toContain('thin liquidity');
  });

  it('summarizes valuations with explicit status buckets', () => {
    const summary = summarizeValuations([
      { assetId: 'a', chainId: 369, symbol: 'A', quantity: '1', status: 'available', valueUsd: 1, confidence: 1, warnings: [], observation: makeObservation({ assetId: 'a' }), provenance: makeObservation({ assetId: 'a' }).provenance },
      { assetId: 'b', chainId: 369, symbol: 'B', quantity: '1', status: 'stale', valueUsd: null, confidence: 0.8, warnings: ['stale'], observation: makeObservation({ assetId: 'b', status: 'stale' }), provenance: makeObservation({ assetId: 'b' }).provenance },
      { assetId: 'c', chainId: 369, symbol: 'C', quantity: '1', status: 'unavailable', valueUsd: null, confidence: null, warnings: ['unavailable'], observation: makeObservation({ assetId: 'c', status: 'unavailable', priceUsd: null, confidence: null }), provenance: makeObservation({ assetId: 'c' }).provenance },
      { assetId: 'd', chainId: 369, symbol: 'D', quantity: '1', status: 'low_confidence', valueUsd: null, confidence: 0.1, warnings: ['low_confidence'], observation: makeObservation({ assetId: 'd', status: 'low_confidence' }), provenance: makeObservation({ assetId: 'd' }).provenance },
    ]);

    expect(summary.status).toBe('partial');
    expect(summary.totalValueUsd).toBe(1);
    expect(summary.valuedAssetCount).toBe(1);
    expect(summary.staleAssetCount).toBe(1);
    expect(summary.unavailableAssetCount).toBe(1);
    expect(summary.lowConfidenceAssetCount).toBe(1);
  });

  it('supports discriminated valuation envelope behavior', () => {
    const success: PortfolioValuationEnvelopeDto = {
      ok: true,
      data: {
        schemaVersion: 'v1',
        asOf: '2026-01-01T00:00:00.000Z',
        valuations: [],
        summary: {
          status: 'unavailable',
          totalValueUsd: 0,
          valuedAssetCount: 0,
          staleAssetCount: 0,
          unavailableAssetCount: 0,
          lowConfidenceAssetCount: 0,
          warnings: [],
        },
      },
      error: null,
    };

    expect(success.ok).toBe(true);
    if (success.ok) {
      expect(success.data.schemaVersion).toBe('v1');
    }
  });

  it('preserves chain-aware assetId identity end-to-end', async () => {
    const chainAwareId = 'erc20:943:0xfeed';
    const service = new PlaceholderValuationService(
      makeProvider([makeObservation({ assetId: chainAwareId, chainId: 943, provenance: { provider: 'placeholder', providerAssetId: chainAwareId, retrievalMethod: 'placeholder', notes: [] } })]),
    );

    const [valuation] = await service.valueAssets([{ assetId: chainAwareId, quantity: '1' }]);
    expect(valuation.assetId).toBe(chainAwareId);
    expect(valuation.observation.assetId).toBe(chainAwareId);
    expect(valuation.chainId).toBe(943);
  });
});
