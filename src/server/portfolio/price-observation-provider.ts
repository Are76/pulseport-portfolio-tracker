import type { PriceObservationDto } from './valuation-types';

export interface PriceObservationProvider {
  getPriceObservation(assetId: string): Promise<PriceObservationDto>;
  getBatchPriceObservations(assetIds: string[]): Promise<PriceObservationDto[]>;
}
