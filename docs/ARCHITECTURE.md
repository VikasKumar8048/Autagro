# FARMORA — System Architecture

## Vision

FARMORA removes middlemen from crop trading by connecting **Sellers (Farmers)**, **Buyers**, and **Transporters** through a transparent marketplace with escrow payments, transport matching, and GPS tracking.

## Architectural Principles

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Monorepo | `apps/api` + `apps/web` + `packages/shared` | Shared validation/types; atomic releases; one CI pipeline |
| API style | REST + OpenAPI | Predictable contracts; easy mobile clients later |
| Backend | NestJS + TypeScript | Modular domains, DI, guards, enterprise patterns |
| Frontend | Next.js 15 App Router | SSR for SEO (marketplace), RSC where useful |
| Database | PostgreSQL + Prisma | ACID for escrow/ledger; migrations; type-safe queries |
| Cache | Redis | OTP rate limits, price cache, session revocation, transport locks |
| Realtime | Socket.IO (Phase 8+) | GPS, notifications, transport race |
| Auth | JWT access + rotating refresh + OTP | Stateless API scaling; OTP fits Indian mobile-first users |
| Payments | Razorpay + Stripe (Phase 6) | India + international; escrow via ledger, not wallet hacks |
| Storage | S3 (Phase 2+) | Crop images, dispute evidence |
| Deploy | Docker → Kubernetes (Phase 10) | Horizontal scale per service |

## High-Level Topology

```
                    ┌─────────────┐
                    │  CloudFront │
                    └──────┬──────┘
                           │
              ┌────────────┴────────────┐
              │                         │
       ┌──────▼──────┐           ┌──────▼──────┐
       │  Next.js    │           │  NestJS API │
       │  (web)      │◄─────────►│  (api)      │
       └─────────────┘   REST    └──────┬──────┘
                                         │
                    ┌────────────────────┼────────────────────┐
                    │                    │                    │
             ┌──────▼──────┐      ┌──────▼──────┐      ┌──────▼──────┐
             │ PostgreSQL  │      │    Redis    │      │  S3 / Maps  │
             └─────────────┘      └─────────────┘      └─────────────┘
```

## Folder Structure

```
farmora/
├── apps/
│   ├── api/                 # NestJS — domain modules
│   │   ├── prisma/
│   │   └── src/
│   │       ├── auth/
│   │       ├── users/
│   │       ├── common/
│   │       └── main.ts
│   └── web/                 # Next.js 15
│       └── src/
│           ├── app/
│           ├── components/
│           ├── lib/
│           └── stores/
├── packages/
│   └── shared/              # Zod schemas, enums, API types
├── docs/
├── docker-compose.yml
└── .github/workflows/       # CI (Phase 10)
```

## Domain Modules (Phased)

| Phase | Module | Responsibility |
|-------|--------|----------------|
| 1 | Auth | OTP, JWT, RBAC, sessions, profiles |
| 2 | Seller | Listings, buyer requests |
| 3 | Buyer | Marketplace, purchase flow |
| 4 | Pricing | eNAM ingestion, Redis cache |
| 5 | Transport | Jobs, matching engine |
| 6 | AgriPay | Escrow, ledger, settlement |
| 7 | GPS | Live tracking, ETA |
| 8 | Notifications | Push, SMS, email |
| 9 | Disputes | Evidence, admin workflow |
| 10 | Ops | K8s, Prometheus, Grafana |

## Security Model

- **Authentication**: Short-lived access JWT (15m default); refresh tokens stored hashed with rotation families
- **Authorization**: Role guard (`SELLER` | `BUYER` | `TRANSPORTER` | `ADMIN`) + resource ownership checks in services
- **OTP**: Rate-limited per phone in Redis; hashed codes in DB; max attempts
- **Input**: class-validator + Zod on shared DTOs
- **Transport**: Helmet, CORS allowlist, rate limiting (Throttler)
- **Audit**: Immutable `AuditLog` rows for auth and payment events

## Order State Machine (Future Phases)

```
LISTED → REQUESTED → SELLER_ACCEPTED → BUYER_CONFIRMED → TRANSPORT_PENDING
  → TRANSPORT_ASSIGNED → PAID_ESCROW → IN_TRANSIT → DELIVERED → ESCROW_RELEASED
```

## Phase 1 Scope

This repository phase implements **Authentication** only: Prisma models for users/sessions/OTP, NestJS auth APIs, Next.js login/profile UI, and tests.
