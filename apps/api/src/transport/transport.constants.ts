export const TransportJobStatus = {
  PENDING: 'PENDING',
  ASSIGNED: 'ASSIGNED',
  PICKED_UP: 'PICKED_UP',
  IN_TRANSIT: 'IN_TRANSIT',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
} as const;

export type TransportJobStatusType =
  (typeof TransportJobStatus)[keyof typeof TransportJobStatus];

export const DEFAULT_MATCH_RADIUS_KM = Number(
  process.env.TRANSPORT_MATCH_RADIUS_KM ?? 100,
);

export const TRANSPORT_LOCK_TTL_SECONDS = 30;
export const TRANSPORT_LOCK_PREFIX = 'transport:accept:';
