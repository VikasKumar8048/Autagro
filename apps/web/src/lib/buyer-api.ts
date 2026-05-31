import { apiRequest } from './api-client';

export interface BuyerDashboard {
  stats: {
    pendingRequests: number;
    awaitingConfirmation: number;
    activeOrders: number;
    completedOrders: number;
  };
  recentOrders: {
    id: string;
    status: string;
    cropName: string;
    variety: string;
    cropAmount: number;
    createdAt: string;
  }[];
}

export interface BuyerOrder {
  id: string;
  status: string;
  cropAmount: number;
  transportFee: number | null;
  currency: string;
  quantity: number;
  listing: {
    cropName: string;
    variety: string;
    unit: string;
    state?: string;
    district?: string;
  };
  sellerName?: string;
  transportJob?: { id: string; status: string } | null;
  createdAt: string;
  nextAction?: string | null;
}

export interface BuyerOrderDetail extends BuyerOrder {
  platformFee: number | null;
  message: string | null;
  listing: BuyerOrder['listing'] & {
    id: string;
    grade: string;
    pincode: string;
    pricePerUnit: number;
  };
  seller: { id: string; phone: string; fullName: string };
  shipment: { id: string; status: string } | null;
}

export interface BuyerRequest {
  id: string;
  listingId: string;
  quantity: number;
  message: string | null;
  status: string;
  estimatedTotal: number;
  listing: {
    id: string;
    cropName: string;
    variety: string;
    unit: string;
    pricePerUnit: number;
    status: string;
  };
  createdAt: string;
}

const auth = (token: string) => ({ accessToken: token });

export const buyerApi = {
  dashboard: (token: string) =>
    apiRequest<BuyerDashboard>('/buyer/dashboard', auth(token)),

  orders: (token: string, status?: string) =>
    apiRequest<BuyerOrder[]>(
      `/buyer/orders${status ? `?status=${status}` : ''}`,
      auth(token),
    ),

  order: (token: string, id: string) =>
    apiRequest<BuyerOrderDetail>(`/buyer/orders/${id}`, auth(token)),

  confirmOrder: (token: string, id: string) =>
    apiRequest<BuyerOrderDetail>(`/buyer/orders/${id}/confirm`, {
      method: 'POST',
      ...auth(token),
    }),

  confirmDelivery: (token: string, id: string) =>
    apiRequest<BuyerOrderDetail>(`/buyer/orders/${id}/confirm-delivery`, {
      method: 'POST',
      ...auth(token),
    }),

  requests: (token: string, status?: string) =>
    apiRequest<BuyerRequest[]>(
      `/buyer/requests${status ? `?status=${status}` : ''}`,
      auth(token),
    ),

  cancelRequest: (token: string, id: string) =>
    apiRequest(`/buyer/requests/${id}/cancel`, { method: 'POST', ...auth(token) }),
};
