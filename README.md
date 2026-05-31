# FARMORA

Production-grade agricultural marketplace — farmer to buyer, without middlemen.

## Stack

- **API**: NestJS, Prisma, PostgreSQL, Redis, JWT + OTP
- **Web**: Next.js 15, React, Tailwind, Zustand, React Query
- **Infra**: Docker Compose (Postgres + Redis)

## Quick start

### 1. Infrastructure

```bash
docker compose up -d
```

### 2. Install dependencies

```bash
npm install
npm run build --workspace=@farmora/shared
```

### 3. Database

```bash
cp .env.example apps/api/.env
npm run db:generate --workspace=@farmora/api
npm run db:migrate:deploy --workspace=@farmora/api
```

### 4. Run

```bash
npm run dev:api
npm run dev:web
```

- Web: http://localhost:3000
- API: http://localhost:4000
- Swagger: http://localhost:4000/api/docs

**Dev OTP**: codes are logged in the API console (`[DEV OTP]`).

## Phase status

| Phase | Module | Status |
|-------|--------|--------|
| 1 | Authentication | Implemented |
| 2 | Seller Dashboard | Implemented |
| 3 | Buyer Dashboard (orders, confirm, requests) | Implemented |
| 4 | Marketplace filters / price engine | Planned |
| 4–10 | See `docs/ARCHITECTURE.md` | Planned |

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Database](docs/DATABASE.md)
- [API (Phase 1)](docs/API.md)

## Tests

```bash
npm run test --workspace=@farmora/api
```
