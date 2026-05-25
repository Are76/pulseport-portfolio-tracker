export type PriceObservationStatus = 'available' | 'stale' | 'unavailable' | 'low_confidence';

export type ValuationStatus = 'available' | 'stale' | 'unavailable' | 'low_confidence';

export type PriceObservationProvenanceDto = {
  provider: string;
  providerAssetId: string;
  retrievalMethod: 'placeholder';
  notes: string[];
};

export type PriceObservationDto = {
  assetId: string;
  chainId: number;
  symbol: string;
  source: string;
  observedAt: string;
  priceUsd: number | null;
  confidence: number | null;
  staleAfter: string;
  status: PriceObservationStatus;
  warnings: string[];
  provenance: PriceObservationProvenanceDto;
};

export type AssetValuationDto = {
  assetId: string;
  chainId: number;
  symbol: string;
  quantity: string;
  status: ValuationStatus;
  valueUsd: number | null;
  confidence: number | null;
  observation: PriceObservationDto;
  warnings: string[];
  provenance: PriceObservationProvenanceDto;
};

export type PortfolioValuationSummaryDto = {
  status: 'available' | 'partial' | 'unavailable';
  totalValueUsd: number;
  valuedAssetCount: number;
  staleAssetCount: number;
  unavailableAssetCount: number;
  lowConfidenceAssetCount: number;
  warnings: string[];
};

export type PortfolioValuationEnvelopeDto =
  | {
      ok: true;
      data: {
        schemaVersion: 'v1';
        asOf: string;
        valuations: AssetValuationDto[];
        summary: PortfolioValuationSummaryDto;
      };
      error: null;
    }
  | {
      ok: false;
      data: null;
      error: {
        code: 'backend_unavailable' | 'invalid_request';
        message: string;
      };
    };


export type ObservationSourceKind = 'rpc' | 'indexer' | 'manual';

export type PersistedPriceObservationDto = {
  observationId: string;
  assetId: string;
  chainId: number;
  source: {
    provider: string;
    kind: ObservationSourceKind;
    priority: number;
    feed: string;
  };
  observedAt: string;
  staleAfter: string;
  priceUsdAtomic: string | null;
  confidenceBps: number | null;
  ingestedAt: string;
  metadata: Record<string, string>;
};
