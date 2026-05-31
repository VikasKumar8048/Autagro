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

OpenAPI: `GET /api/docs` (Swagger UI)
