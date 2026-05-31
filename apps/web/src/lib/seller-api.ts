import { apiRequest } from './api-client';

export interface SellerDashboard {
  stats: {
    totalListings: number;
    activeListings: number;
    soldListings: number;
    pendingRequests: number;
    acceptedOrders: number;
    inTransitOrders: number;
    totalEarnings: number;
  };
  recentRequests: {
    id: string;
    cropName: string;
    variety: string;
    quantity: number;
    buyerName: string;
    createdAt: string;
  }[];
}

export interface CropListing {
  id: string;
  cropName: string;
  variety: string;
  quantity: number;
  unit: string;
  grade: string;
  harvestDate: string;
  pricePerUnit: number;
  status: string;
  state: string;
  district: string;
  pincode: string;
  imageUrls: string[];
  pendingRequestCount?: number;
}

export interface PurchaseRequestItem {
  id: string;
  listingId: string;
  quantity: number;
  message: string | null;
  status: string;
  estimatedTotal: number;
  listing: { cropName: string; variety: string; unit: string; pricePerUnit: number };
  buyer: { fullName: string; phone: string };
  createdAt: string;
}

export const sellerApi = {
  dashboard: (token: string) =>
    apiRequest<SellerDashboard>('/seller/dashboard', { accessToken: token }),

  listings: (token: string, status?: string) =>
    apiRequest<CropListing[]>(
      `/seller/listings${status ? `?status=${status}` : ''}`,
      { accessToken: token },
    ),

  createListing: (token: string, body: Record<string, unknown>) =>
    apiRequest<CropListing>('/seller/listings', {
      method: 'POST',
      accessToken: token,
      body: JSON.stringify(body),
    }),

  publishListing: (token: string, id: string) =>
    apiRequest<CropListing>(`/seller/listings/${id}/publish`, {
      method: 'POST',
      accessToken: token,
    }),

  deleteListing: (token: string, id: string) =>
    apiRequest<CropListing>(`/seller/listings/${id}`, {
      method: 'DELETE',
      accessToken: token,
    }),

  requests: (token: string, status?: string) =>
    apiRequest<PurchaseRequestItem[]>(
      `/seller/requests${status ? `?status=${status}` : ''}`,
      { accessToken: token },
    ),

  acceptRequest: (token: string, id: string) =>
    apiRequest(`/seller/requests/${id}/accept`, {
      method: 'POST',
      accessToken: token,
    }),

  rejectRequest: (token: string, id: string) =>
    apiRequest(`/seller/requests/${id}/reject`, {
      method: 'POST',
      accessToken: token,
    }),
};
