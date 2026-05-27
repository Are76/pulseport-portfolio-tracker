import { describe, expect, it, vi } from 'vitest';

import type { PriceProviderAdapter } from '../server/portfolio/price-provider-adapter';
import { createDeterministicFixturePriceProvider } from '../server/portfolio/price-provider-adapter';
import { createPriceProviderRegistry } from '../server/portfolio/price-provider-registry';

function createProvider(id: string, source = 'fixture'): PriceProviderAdapter {
  return {
    metadata: { id, displayName: id, source },
    async getPriceObservations() {
      return { observations: [], unsupportedAssets: [] };
    },
  };
}

describe('price provider registry', () => {
  it('returns providers in deterministic provider id order', () => {
    const registry = createPriceProviderRegistry([
      { provider: createProvider('provider-z') },
      { provider: createProvider('provider-a') },
      { provider: createProvider('provider-m') },
    ]);

    expect(registry.listProviders().map((provider) => provider.metadata.id)).toEqual(['provider-a', 'provider-m', 'provider-z']);
  });

  it('rejects duplicate provider ids deterministically', () => {
    expect(() => createPriceProviderRegistry([
      { provider: createProvider('provider-same') },
      { provider: createProvider('provider-same') },
    ])).toThrow('Duplicate price provider id: provider-same');
  });


  it('treats undefined providerIds as no provider-id filter and explicit empty providerIds as empty selection', () => {
    const registry = createPriceProviderRegistry([
      { provider: createProvider('provider-a') },
      { provider: createProvider('provider-b') },
    ]);

    expect(registry.listProviders({ providerIds: undefined }).map((provider) => provider.metadata.id)).toEqual(['provider-a', 'provider-b']);
    expect(registry.listProviders({ providerIds: [] })).toEqual([]);
  });

  it('fails closed for unknown selected provider ids', () => {
    const registry = createPriceProviderRegistry([{ provider: createProvider('provider-known') }]);
    expect(() => registry.listProviders({ providerIds: ['provider-missing'] })).toThrow('Unknown price provider id requested: provider-missing');
  });

  it('supports combined provider id/source/profile filters and non-matching known ids without unknown-id errors', () => {
    const fixtureProvider = createDeterministicFixturePriceProvider([]);
    const registry = createPriceProviderRegistry([
      { provider: createProvider('provider-live', 'live') },
      { provider: fixtureProvider, profile: 'test-fixture' },
    ]);

    expect(registry.listProviders({ providerIds: ['provider-live'] }).map((provider) => provider.metadata.id)).toEqual(['provider-live']);
    expect(registry.listProviders({ source: 'test-fixture' }).map((provider) => provider.metadata.id)).toEqual(['fixture-deterministic']);
    expect(registry.listProviders({ profile: 'test-fixture' }).map((provider) => provider.metadata.id)).toEqual(['fixture-deterministic']);
    expect(registry.listProviders({ providerIds: ['provider-live'], source: 'test-fixture' })).toEqual([]);
    expect(registry.listProviders({ providerIds: ['provider-live'], profile: 'test-fixture' })).toEqual([]);
    expect(registry.listProviders({ providerIds: ['fixture-deterministic'], source: 'test-fixture', profile: 'test-fixture' }).map((provider) => provider.metadata.id)).toEqual(['fixture-deterministic']);
  });

  it('returns providers without mutating provider metadata', async () => {
    const provider = createProvider('provider-stable');
    const registry = createPriceProviderRegistry([{ provider }]);

    const selected = registry.listProviders();
    const mutableMetadata = selected[0].metadata as { id: string; displayName: string; source: string };
    mutableMetadata.id = 'provider-mutated';
    mutableMetadata.displayName = 'Mutated';
    mutableMetadata.source = 'mutated-source';

    const selectedAgain = registry.listProviders();
    expect(selectedAgain[0].metadata).toEqual({ id: 'provider-stable', displayName: 'provider-stable', source: 'fixture' });

    await selected[0].getPriceObservations([]);
    expect(provider.metadata.id).toBe('provider-stable');
  });

  it('does not perform pricing, ingestion, resolving, or valuation', async () => {
    const getPriceObservations = vi.fn(async () => ({ observations: [], unsupportedAssets: [] }));
    const provider: PriceProviderAdapter = {
      metadata: { id: 'provider-passive', displayName: 'Passive', source: 'fixture' },
      getPriceObservations,
    };

    const registry = createPriceProviderRegistry([{ provider }]);
    const listed = registry.listProviders();

    expect(getPriceObservations).not.toHaveBeenCalled();
    expect(listed).toHaveLength(1);
    expect((registry as unknown as Record<string, unknown>).ingestPriceObservations).toBeUndefined();
    expect((registry as unknown as Record<string, unknown>).resolveObservation).toBeUndefined();
    expect((registry as unknown as Record<string, unknown>).computePortfolioValue).toBeUndefined();
  });
});
