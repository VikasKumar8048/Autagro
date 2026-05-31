import { apiRequest } from './api-client';

export interface TransporterJob {
  id: string;
  orderId: string;
  status: string;
  cropAmount: number;
  transportFee: number | null;
  distanceKm?: number | null;
  estimatedTransportFee?: number | null;
  pickup: { lat: number | null; lng: number | null; label?: string };
  drop: { lat: number | null; lng: number | null; label?: string };
  listing: { cropName: string; variety: string; quantity: number; unit: string };
  shipment?: {
    id: string;
    status: string;
    lastLocation: { lat: number; lng: number; recordedAt: string } | null;
  } | null;
  acceptedAt: string | null;
  createdAt: string;
}

const auth = (token: string) => ({ accessToken: token });

export const transporterApi = {
  dashboard: (token: string) =>
    apiRequest<{ stats: Record<string, number> }>('/transporter/dashboard', auth(token)),

  updateLocation: (token: string, latitude: number, longitude: number) =>
    apiRequest('/transporter/location', {
      method: 'POST',
      ...auth(token),
      body: JSON.stringify({ latitude, longitude }),
    }),

  availableJobs: (token: string, radiusKm?: number) =>
    apiRequest<TransporterJob[]>(
      `/transporter/jobs/available${radiusKm ? `?radiusKm=${radiusKm}` : ''}`,
      auth(token),
    ),

  acceptJob: (token: string, jobId: string) =>
    apiRequest<TransporterJob>(`/transporter/jobs/${jobId}/accept`, {
      method: 'POST',
      ...auth(token),
    }),

  activeJobs: (token: string) =>
    apiRequest<TransporterJob[]>('/transporter/jobs/active', auth(token)),

  getJob: (token: string, jobId: string) =>
    apiRequest<TransporterJob>(`/transporter/jobs/${jobId}`, auth(token)),

  startPickup: (token: string, jobId: string) =>
    apiRequest<TransporterJob>(`/transporter/jobs/${jobId}/pickup`, {
      method: 'POST',
      ...auth(token),
    }),

  startTransit: (token: string, jobId: string) =>
    apiRequest<TransporterJob>(`/transporter/jobs/${jobId}/transit`, {
      method: 'POST',
      ...auth(token),
    }),

  recordGps: (token: string, jobId: string, latitude: number, longitude: number) =>
    apiRequest<TransporterJob>(`/transporter/jobs/${jobId}/location`, {
      method: 'POST',
      ...auth(token),
      body: JSON.stringify({ latitude, longitude }),
    }),

  completeDelivery: (token: string, jobId: string) =>
    apiRequest<TransporterJob>(`/transporter/jobs/${jobId}/deliver`, {
      method: 'POST',
      ...auth(token),
    }),
};

export const trackingApi = {
  getOrderTracking: (token: string, orderId: string) =>
    apiRequest<{
      orderId: string;
      orderStatus: string;
      transportJob: { id: string; status: string } | null;
      shipment: { id: string; status: string; eta: string | null } | null;
      route: { lat: number; lng: number; recordedAt: string }[];
      listing: { cropName: string; variety: string };
    }>(`/orders/${orderId}/tracking`, auth(token)),
};
