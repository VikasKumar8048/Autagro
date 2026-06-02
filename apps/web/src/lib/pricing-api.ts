import { apiRequest } from './api-client';

export interface MarketPriceRow {
  id: string;
  marketName: string;
  state: string;
  minPrice: number;
  maxPrice: number;
  modalPrice: number;
  unit: string;
  source: string;
  recordedOn: string;
}

export interface MarketPricesResponse {
  cropName: string;
  state: string | null;
  markets: MarketPriceRow[];
}

export interface TrendResponse {
  cropName: string;
  days: number;
  points: {
    date: string;
    modalPrice: number;
    minPrice: number;
    maxPrice: number;
  }[];
}

export interface SpreadResponse {
  cropName: string;
  state: string | null;
  marketCount: number;
  lowestModal: { marketName: string; modalPrice: number } | null;
  highestModal: { marketName: string; modalPrice: number } | null;
  spread: number | null;
}

export const pricingApi = {
  markets: (cropName: string, state?: string) =>
    apiRequest<MarketPricesResponse>(
      `/pricing/markets?cropName=${encodeURIComponent(cropName)}${state ? `&state=${encodeURIComponent(state)}` : ''}`,
    ),
  trend: (cropName: string, days = 7) =>
    apiRequest<TrendResponse>(
      `/pricing/trend?cropName=${encodeURIComponent(cropName)}&days=${days}`,
    ),
  spread: (cropName: string, state?: string) =>
    apiRequest<SpreadResponse>(
      `/pricing/spread?cropName=${encodeURIComponent(cropName)}${state ? `&state=${encodeURIComponent(state)}` : ''}`,
    ),
};
