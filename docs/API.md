# FARMORA — API Design (Phase 1: Auth)

Base URL: `/api/v1`

## Auth

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/auth/otp/request` | Send OTP to phone | Public |
| POST | `/auth/otp/verify` | Verify OTP; issue tokens | Public |
| POST | `/auth/register` | Complete profile after OTP (new users) | Public |
| POST | `/auth/login/password` | Email/phone + password login | Public |
| POST | `/auth/refresh` | Rotate refresh token | Public |
| POST | `/auth/logout` | Revoke refresh + session | Bearer |
| POST | `/auth/logout-all` | Revoke all sessions | Bearer |
| POST | `/auth/password/forgot` | Request reset OTP | Public |
| POST | `/auth/password/reset` | Reset with OTP | Public |
| GET | `/auth/sessions` | List active sessions | Bearer |

## Users

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/users/me` | Current user + profile | Bearer |
| PATCH | `/users/me` | Update profile | Bearer |
| PATCH | `/users/me/password` | Change password | Bearer |

## Seller (Phase 2)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/seller/dashboard` | Stats + recent requests | SELLER |
| GET | `/seller/listings` | List own listings | SELLER |
| POST | `/seller/listings` | Create draft listing | SELLER |
| GET | `/seller/listings/:id` | Listing + pending requests | SELLER |
| PATCH | `/seller/listings/:id` | Update listing | SELLER |
| POST | `/seller/listings/:id/publish` | Publish draft | SELLER |
| DELETE | `/seller/listings/:id` | Soft-remove listing | SELLER |
| GET | `/seller/requests` | Incoming purchase requests | SELLER |
| POST | `/seller/requests/:id/accept` | Accept → creates order | SELLER |
| POST | `/seller/requests/:id/reject` | Reject request | SELLER |

## Marketplace (public browse)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/marketplace/listings` | Search active listings | Public |
| GET | `/marketplace/listings/:id` | Listing detail | Public |

## Purchase requests

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/purchase-requests` | Buyer sends request | BUYER |

## Buyer (Phase 3)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/buyer/dashboard` | Stats + recent orders | BUYER |
| GET | `/buyer/orders` | List orders | BUYER |
| GET | `/buyer/orders/:id` | Order detail | BUYER |
| POST | `/buyer/orders/:id/confirm` | Confirm → transport pending | BUYER |
| GET | `/buyer/requests` | My purchase requests | BUYER |
| POST | `/buyer/requests/:id/cancel` | Cancel pending request | BUYER |
| GET | `/seller/orders` | Seller order list | SELLER |
| POST | `/buyer/orders/:id/confirm-delivery` | Confirm crop received | BUYER |

## Transporter (Phase 5)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/transporter/dashboard` | Stats | TRANSPORTER |
| POST | `/transporter/location` | Update GPS for matching | TRANSPORTER |
| GET | `/transporter/jobs/available` | Nearby open jobs | TRANSPORTER |
| POST | `/transporter/jobs/:id/accept` | Accept job (Redis lock) | TRANSPORTER |
| GET | `/transporter/jobs/active` | Active deliveries | TRANSPORTER |
| POST | `/transporter/jobs/:id/pickup` | Mark picked up | TRANSPORTER |
| POST | `/transporter/jobs/:id/transit` | Start transit | TRANSPORTER |
| POST | `/transporter/jobs/:id/location` | GPS ping | TRANSPORTER |
| POST | `/transporter/jobs/:id/deliver` | Complete delivery | TRANSPORTER |
| GET | `/orders/:orderId/tracking` | Shipment GPS trail | BUYER/SELLER |

## AgriPay Escrow (Phase 6)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/payments/orders/:orderId/checkout` | Create payment session | BUYER |
| POST | `/payments/orders/:orderId/verify` | Verify Razorpay & fund escrow | BUYER |
| POST | `/payments/orders/:orderId/mock-pay` | Dev instant pay | BUYER |
| GET | `/payments/orders/:orderId/escrow` | Escrow + ledger | Bearer |
| GET | `/wallet/me` | Wallet balance & settlements | Bearer |

**Settlement:** On `POST /buyer/orders/:id/confirm-delivery`, escrow splits to seller (crop), transporter (fee), and platform (commission).

## Pricing (Phase 4)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/pricing/markets?cropName=...&state=...` | Latest mandi prices by market | Public |
| GET | `/pricing/trend?cropName=...&days=7` | Daily aggregated trend | Public |
| GET | `/pricing/spread?cropName=...&state=...` | Best/worst modal spread | Public |
| POST | `/pricing/ingest/mock` | Seed mock eNAM snapshots | Bearer (ADMIN) |

## Ops (Phase 10 start)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/ops/live` | Liveness probe | Public |
| GET | `/ops/ready` | Readiness probe (DB + Redis checks) | Public |
| GET | `/ops/metrics` | Prometheus-style service metrics | Public |

## Disputes (Phase 9)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/disputes` | Open dispute on order | Bearer (buyer/seller) |
| GET | `/disputes/mine` | My disputes | Bearer |
| GET | `/disputes/:id` | Dispute detail | Bearer |
| GET | `/admin/disputes` | Admin queue | Bearer (ADMIN) |
| PATCH | `/admin/disputes/:id` | Review / resolve / reject | Bearer (ADMIN) |

## Notifications (Phase 8)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/notifications` | List notifications | Bearer |
| GET | `/notifications/unread-count` | Unread count | Bearer |
| PATCH | `/notifications/read-all` | Mark all read | Bearer |
| PATCH | `/notifications/:id/read` | Mark one read | Bearer |

OpenAPI: `GET /api/docs` (Swagger UI)
