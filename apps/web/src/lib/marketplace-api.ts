import { apiRequest } from './api-client';

export interface MarketplaceListing {
  id: string;
  cropName: string;
  variety: string;
  quantity: number;
  unit: string;
  grade: string;
  harvestDate: string;
  pricePerUnit: number;
  currency: string;
  location: { state: string; district: string; pincode: string };
  imageUrls: string[];
  seller: { id: string; name: string | null; state?: string; district?: string };
}

export interface MarketplaceSearchResult {
  items: MarketplaceListing[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export const marketplaceApi = {
  search: (params: Record<string, string>) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest<MarketplaceSearchResult>(`/marketplace/listings?${query}`);
  },

  getById: (id: string) =>
    apiRequest<MarketplaceListing>(`/marketplace/listings/${id}`),

  createRequest: (
    token: string,
    body: { listingId: string; quantity: number; message?: string },
  ) =>
    apiRequest('/purchase-requests', {
      method: 'POST',
      accessToken: token,
      body: JSON.stringify(body),
    }),
};
