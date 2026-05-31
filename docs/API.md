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

OpenAPI: `GET /api/docs` (Swagger UI)
