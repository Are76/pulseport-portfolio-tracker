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
    getBatchPriceObservations: async (assetIds: string[]) => observations.filter(item => assetIds.includes(item.assetId)),
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



  it('downgrades available observation with null priceUsd to unavailable with explicit warning/provenance note', async () => {
    const service = new PlaceholderValuationService(
      makeProvider([makeObservation({ status: 'available', priceUsd: null })]),
    );

    const [valuation] = await service.valueAssets([{ assetId: 'erc20:369:0xabc', quantity: '3' }]);
    const summary = summarizeValuations([valuation]);

    expect(valuation.status).toBe('unavailable');
    expect(valuation.valueUsd).toBeNull();
    expect(valuation.warnings).toContain('Observation reported available status but valuation inputs were unusable.');
    expect(valuation.provenance.notes).toContain('Available-status observation was downgraded to unavailable because priceUsd was null or non-finite.');
    expect(summary.status).toBe('unavailable');
    expect(summary.valuedAssetCount).toBe(0);
  });

  it('downgrades available observation with non-finite priceUsd to unavailable', async () => {
    const service = new PlaceholderValuationService(
      makeProvider([makeObservation({ status: 'available', priceUsd: Number.NaN })]),
    );

    const [valuation] = await service.valueAssets([{ assetId: 'erc20:369:0xabc', quantity: '3' }]);

    expect(valuation.status).toBe('unavailable');
    expect(valuation.valueUsd).toBeNull();
    expect(valuation.warnings).toContain('Observation reported available status but valuation inputs were unusable.');
  });



  it('downgrades available observation with malformed quantity to unavailable and null value', async () => {
    const service = new PlaceholderValuationService(
      makeProvider([makeObservation({ status: 'available', priceUsd: 2 })]),
    );

    const [valuation] = await service.valueAssets([{ assetId: 'erc20:369:0xabc', quantity: 'NaN' }]);

    expect(valuation.status).toBe('unavailable');
    expect(valuation.valueUsd).toBeNull();
    expect(valuation.warnings).toContain('Observation reported available status but valuation inputs were unusable.');
    expect(valuation.provenance.notes.some(note => note.includes('quantity was malformed or non-finite'))).toBe(true);
  });

  it('keeps summary totalValueUsd finite when available status has unusable quantity', async () => {
    const service = new PlaceholderValuationService(
      makeProvider([makeObservation({ status: 'available', priceUsd: 2 })]),
    );

    const [valuation] = await service.valueAssets([{ assetId: 'erc20:369:0xabc', quantity: 'Infinity' }]);
    const summary = summarizeValuations([valuation]);

    expect(Number.isFinite(summary.totalValueUsd)).toBe(true);
    expect(summary.totalValueUsd).toBe(0);
    expect(summary.valuedAssetCount).toBe(0);
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
    expect(valuation.chainId).toBe(369);
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



  it('returns available summary for empty valuation set with zero totals and no warnings', () => {
    const summary = summarizeValuations([]);

    expect(summary.status).toBe('available');
    expect(summary.totalValueUsd).toBe(0);
    expect(summary.valuedAssetCount).toBe(0);
    expect(summary.staleAssetCount).toBe(0);
    expect(summary.unavailableAssetCount).toBe(0);
    expect(summary.lowConfidenceAssetCount).toBe(0);
    expect(summary.warnings).toEqual([]);
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



  it('provider batch helper returns only observations for requested assetIds', async () => {
    const requestedAssetId = 'erc20:369:0xrequested';
    const service = new PlaceholderValuationService(
      makeProvider([
        makeObservation({ assetId: requestedAssetId, provenance: { provider: 'placeholder', providerAssetId: requestedAssetId, retrievalMethod: 'placeholder', notes: [] } }),
        makeObservation({ assetId: 'erc20:369:0xother', provenance: { provider: 'placeholder', providerAssetId: 'erc20:369:0xother', retrievalMethod: 'placeholder', notes: [] } }),
      ]),
    );

    const [valuation] = await service.valueAssets([{ assetId: requestedAssetId, quantity: '1' }]);
    expect(valuation.assetId).toBe(requestedAssetId);
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

  it('marks summary as partial when any stale valuation exists', () => {
    const summary = summarizeValuations([
      { assetId: 'a', chainId: 369, symbol: 'A', quantity: '1', status: 'available', valueUsd: 1, confidence: 1, warnings: [], observation: makeObservation({ assetId: 'a' }), provenance: makeObservation({ assetId: 'a' }).provenance },
      { assetId: 'b', chainId: 369, symbol: 'B', quantity: '1', status: 'stale', valueUsd: null, confidence: 0.7, warnings: ['stale'], observation: makeObservation({ assetId: 'b', status: 'stale' }), provenance: makeObservation({ assetId: 'b' }).provenance },
    ]);

    expect(summary.status).toBe('partial');
  });

  it('marks summary as partial when any low_confidence valuation exists', () => {
    const summary = summarizeValuations([
      { assetId: 'a', chainId: 369, symbol: 'A', quantity: '1', status: 'available', valueUsd: 1, confidence: 1, warnings: [], observation: makeObservation({ assetId: 'a' }), provenance: makeObservation({ assetId: 'a' }).provenance },
      { assetId: 'b', chainId: 369, symbol: 'B', quantity: '1', status: 'low_confidence', valueUsd: null, confidence: 0.2, warnings: ['low'], observation: makeObservation({ assetId: 'b', status: 'low_confidence' }), provenance: makeObservation({ assetId: 'b' }).provenance },
    ]);

    expect(summary.status).toBe('partial');
  });

  it('marks summary as unavailable when all valuations are unavailable', () => {
    const summary = summarizeValuations([
      { assetId: 'a', chainId: 369, symbol: 'A', quantity: '1', status: 'unavailable', valueUsd: null, confidence: null, warnings: ['u'], observation: makeObservation({ assetId: 'a', status: 'unavailable', priceUsd: null, confidence: null }), provenance: makeObservation({ assetId: 'a' }).provenance },
      { assetId: 'b', chainId: 369, symbol: 'B', quantity: '1', status: 'unavailable', valueUsd: null, confidence: null, warnings: ['u'], observation: makeObservation({ assetId: 'b', status: 'unavailable', priceUsd: null, confidence: null }), provenance: makeObservation({ assetId: 'b' }).provenance },
    ]);

    expect(summary.status).toBe('unavailable');
  });

  it('keeps summary partial for mixed available and unavailable valuations', () => {
    const summary = summarizeValuations([
      { assetId: 'a', chainId: 369, symbol: 'A', quantity: '1', status: 'available', valueUsd: 1, confidence: 1, warnings: [], observation: makeObservation({ assetId: 'a' }), provenance: makeObservation({ assetId: 'a' }).provenance },
      { assetId: 'b', chainId: 369, symbol: 'B', quantity: '1', status: 'unavailable', valueUsd: null, confidence: null, warnings: ['u'], observation: makeObservation({ assetId: 'b', status: 'unavailable', priceUsd: null, confidence: null }), provenance: makeObservation({ assetId: 'b' }).provenance },
    ]);

    expect(summary.status).toBe('partial');
  });

  it('missing observation for erc20:943 asset preserves chainId 943', async () => {
    const service = new PlaceholderValuationService(makeProvider([]));
    const [valuation] = await service.valueAssets([{ assetId: 'erc20:943:0xmissing', quantity: '3' }]);

    expect(valuation.assetId).toBe('erc20:943:0xmissing');
    expect(valuation.chainId).toBe(943);
    expect(valuation.observation.chainId).toBe(943);
  });

  it('missing observation for native:369 asset preserves chainId 369', async () => {
    const service = new PlaceholderValuationService(makeProvider([]));
    const [valuation] = await service.valueAssets([{ assetId: 'native:369:pls', quantity: '3' }]);

    expect(valuation.assetId).toBe('native:369:pls');
    expect(valuation.chainId).toBe(369);
    expect(valuation.observation.chainId).toBe(369);
  });



  it('malformed chainId segment like erc20:369abc does not preserve 369 and uses safe fallback warnings', async () => {
    const service = new PlaceholderValuationService(makeProvider([]));
    const [valuation] = await service.valueAssets([{ assetId: 'erc20:369abc:0xdeadbeef', quantity: '3' }]);

    expect(valuation.assetId).toBe('erc20:369abc:0xdeadbeef');
    expect(valuation.chainId).toBe(-1);
    expect(valuation.observation.chainId).toBe(-1);
    expect(valuation.warnings).toContain('Unable to parse chainId from assetId; using safe unavailable chainId fallback.');
    expect(valuation.provenance.notes).toContain('chainId parse failed from assetId; safe unavailable fallback used instead of assuming 369.');
  });

  it('malformed assetId fallback never silently claims 369 and emits parse warnings', async () => {
    const service = new PlaceholderValuationService(makeProvider([]));
    const [valuation] = await service.valueAssets([{ assetId: 'bad-asset-id', quantity: '3' }]);

    expect(valuation.assetId).toBe('bad-asset-id');
    expect(valuation.chainId).toBe(-1);
    expect(valuation.observation.chainId).toBe(-1);
    expect(valuation.warnings).toContain('Unable to parse chainId from assetId; using safe unavailable chainId fallback.');
    expect(valuation.provenance.notes).toContain('chainId parse failed from assetId; safe unavailable fallback used instead of assuming 369.');
  });

});
