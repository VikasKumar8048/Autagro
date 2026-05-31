# AgriPay — Escrow Architecture

## Money flow

```
Buyer pays (Razorpay) → Escrow FUNDED → Order PAID_ESCROW
        ↓
Buyer confirms delivery → Escrow RELEASED
        ↓
├── Seller wallet  (+ crop amount)
├── Transporter wallet (+ transport fee)
└── Platform ledger  (+ commission %)
```

## Breakdown example

| Party | Amount |
|-------|--------|
| Crop (seller) | ₹100,000 |
| Transport | ₹10,000 |
| Platform (2.5% of crop) | ₹2,500 |
| **Buyer pays** | **₹112,500** |

Configure via `PLATFORM_FEE_PERCENT`, `TRANSPORT_BASE_FEE_INR`, `TRANSPORT_PER_KM_INR`.

## Components

- **EscrowAccount** — per-order hold; statuses: PENDING → FUNDED → RELEASED
- **LedgerEntry** — immutable audit trail; balanced debits/credits per escrow
- **PaymentRecord** — Razorpay/MOCK provider reference + idempotency key
- **UserWallet** — settlement balance per user (seller/transporter)

## Providers

| Env | Provider |
|-----|----------|
| `PAYMENT_PROVIDER=MOCK` | Dev — mock pay button |
| `PAYMENT_PROVIDER=RAZORPAY` + keys | Production Razorpay Checkout |

## Payment timing

Buyer may pay when order is `TRANSPORT_ASSIGNED` (or later). Transport fee must be set (transporter accepted).
