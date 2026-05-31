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

OpenAPI: `GET /api/docs` (Swagger UI)
