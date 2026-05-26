import type { PriceProviderAdapter, PriceProviderMetadata } from './price-provider-adapter';

export type PriceProviderProfile = 'test-fixture' | 'default';

export type PriceProviderRegistration = {
  provider: PriceProviderAdapter;
  profile?: PriceProviderProfile;
};

export type PriceProviderSelection = {
  providerIds?: string[];
  source?: string;
  profile?: PriceProviderProfile;
};

export type PriceProviderRegistry = {
  listProviders(selection?: PriceProviderSelection): PriceProviderAdapter[];
};

function compareStrings(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function cloneMetadata(metadata: PriceProviderMetadata): PriceProviderMetadata {
  return {
    id: metadata.id,
    displayName: metadata.displayName,
    source: metadata.source,
  };
}

function cloneProvider(provider: PriceProviderAdapter): PriceProviderAdapter {
  return {
    metadata: cloneMetadata(provider.metadata),
    getPriceObservations: provider.getPriceObservations.bind(provider),
  };
}

export function createPriceProviderRegistry(registrations: PriceProviderRegistration[]): PriceProviderRegistry {
  const ordered = registrations
    .map((registration) => ({
      provider: cloneProvider(registration.provider),
      profile: registration.profile ?? (registration.provider.metadata.source === 'test-fixture' ? 'test-fixture' : 'default'),
    }))
    .sort((a, b) => compareStrings(a.provider.metadata.id, b.provider.metadata.id));

  for (let index = 1; index < ordered.length; index += 1) {
    if (ordered[index - 1].provider.metadata.id === ordered[index].provider.metadata.id) {
      throw new Error(`Duplicate price provider id: ${ordered[index].provider.metadata.id}`);
    }
  }

  return {
    listProviders(selection?: PriceProviderSelection): PriceProviderAdapter[] {
      const requestedProviderIds = selection?.providerIds?.length ? new Set(selection.providerIds) : null;
      const selected = ordered.filter(({ provider, profile }) => {
        if (requestedProviderIds && !requestedProviderIds.has(provider.metadata.id)) return false;
        if (selection?.source && provider.metadata.source !== selection.source) return false;
        if (selection?.profile && profile !== selection.profile) return false;
        return true;
      });

      if (requestedProviderIds) {
        for (const providerId of requestedProviderIds) {
          if (!selected.some((entry) => entry.provider.metadata.id === providerId)) {
            throw new Error(`Unknown price provider id requested: ${providerId}`);
          }
        }
      }

      return selected.map(({ provider }) => cloneProvider(provider));
    },
  };
}
