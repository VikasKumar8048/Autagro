export const NotificationEvents = {
  PURCHASE_REQUEST: 'PURCHASE_REQUEST',
  REQUEST_ACCEPTED: 'REQUEST_ACCEPTED',
  REQUEST_REJECTED: 'REQUEST_REJECTED',
  ORDER_CONFIRMED: 'ORDER_CONFIRMED',
  TRANSPORT_ASSIGNED: 'TRANSPORT_ASSIGNED',
  PAYMENT_RECEIVED: 'PAYMENT_RECEIVED',
  SHIPMENT_UPDATE: 'SHIPMENT_UPDATE',
  DELIVERY_COMPLETE: 'DELIVERY_COMPLETE',
  ESCROW_RELEASED: 'ESCROW_RELEASED',
  DISPUTE_OPENED: 'DISPUTE_OPENED',
  DISPUTE_RESOLVED: 'DISPUTE_RESOLVED',
} as const;

export interface NotificationPayload {
  userId: string;
  type: keyof typeof NotificationEvents;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sendEmail?: boolean;
  sendSms?: boolean;
}
