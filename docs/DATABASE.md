# FARMORA — Database Design

## Phase 1 (Implemented)

### `users`
Core identity. Phone is primary login identifier for OTP flow.

### `user_profiles`
Role-specific metadata (farm location, business name, vehicle info).

### `otp_challenges`
Hashed OTP codes with expiry and attempt tracking.

### `refresh_tokens`
Hashed refresh tokens with **family** ID for rotation detection (reuse = revoke family).

### `sessions`
Active device sessions for session management UI.

### `audit_logs`
Security and compliance trail.

## Future Phases (Schema Present, APIs Later)

- `crop_listings`, `purchase_requests`, `orders`
- `transport_jobs`, `transport_offers`
- `escrow_accounts`, `ledger_entries`, `payments`
- `shipments`, `gps_points`
- `ratings`, `disputes`, `notifications`

Indexes favor: `(role, status)`, `(seller_id, status)`, `(buyer_id)`, geospatial queries on listings (PostGIS later).
