import { apiRequest } from './api-client';

export interface DisputeItem {
  id: string;
  orderId: string;
  type: string;
  description: string;
  status: string;
  resolution: string | null;
  cropName: string | null;
  createdAt: string;
}

export const disputesApi = {
  create: (
    token: string,
    body: { orderId: string; type: string; description: string; evidenceUrls?: string[] },
  ) =>
    apiRequest<DisputeItem>('/disputes', {
      method: 'POST',
      accessToken: token,
      body: JSON.stringify(body),
    }),

  listMine: (token: string) =>
    apiRequest<DisputeItem[]>('/disputes/mine', { accessToken: token }),

  adminList: (token: string, status?: string) =>
    apiRequest<DisputeItem[]>(
      `/admin/disputes${status ? `?status=${status}` : ''}`,
      { accessToken: token },
    ),

  adminResolve: (
    token: string,
    id: string,
    body: {
      status: string;
      outcome?: 'REFUND_BUYER' | 'RELEASE_SELLER' | 'REJECT';
      resolution?: string;
    },
  ) =>
    apiRequest(`/admin/disputes/${id}`, {
      method: 'PATCH',
      accessToken: token,
      body: JSON.stringify(body),
    }),
};
