export const LedgerDirection = {
  DEBIT: 'DEBIT',
  CREDIT: 'CREDIT',
} as const;

export const LedgerEntryType = {
  ESCROW_FUNDING: 'ESCROW_FUNDING',
  SETTLEMENT_SELLER: 'SETTLEMENT_SELLER',
  SETTLEMENT_TRANSPORTER: 'SETTLEMENT_TRANSPORTER',
  SETTLEMENT_PLATFORM: 'SETTLEMENT_PLATFORM',
  REFUND_BUYER: 'REFUND_BUYER',
} as const;

export const PaymentProviderName = {
  RAZORPAY: 'RAZORPAY',
  STRIPE: 'STRIPE',
  MOCK: 'MOCK',
} as const;

export const PLATFORM_FEE_PERCENT = Number(process.env.PLATFORM_FEE_PERCENT ?? 2.5);

/** Order statuses where buyer may fund escrow (transport fee must be known). */
export const PAYABLE_ORDER_STATUSES = [
  'TRANSPORT_ASSIGNED',
  'TRANSPORT_PENDING',
  'IN_TRANSIT',
  'DELIVERED',
] as const;
