# Backend Roadmap

## Completed — Foundation

- Monorepo: pnpm + Turborepo.
- NestJS API under `apps/api`.
- PostgreSQL via Docker Compose.
- Prisma 7 configured with `moduleFormat = "cjs"`.
- Prisma Client generated into `apps/api/src/generated/prisma` (not committed).
- NestJS `ConfigModule` wired globally.
- `PrismaModule` (`@Global()`) and `PrismaService` added.
- `GET /health` endpoint verifies real DB connectivity.

## Completed — Authentication

- Clerk-based authentication via `ClerkAuthGuard`.
- `ClerkAuthGuard` resolves a `User` row from the DB (keyed to Clerk session).
- All dashboard routes require `ClerkAuthGuard`.
- `GET /businesses/me` — returns the business(es) the authenticated user belongs to.
- E2E tests use `MockClerkAuthGuard` (static `currentUser` property, reset in `beforeEach`).

## Completed — Dashboard Read Endpoints

All read endpoints below are implemented and covered by e2e tests.

### Access model

- `assertAccess` — any `BusinessUser` (OWNER, MANAGER, MEMBER). Used on most read endpoints.
- `assertOwnerAccess` — OWNER only. Used on user-management endpoint.
- `assertMutationAccess` — OWNER or MANAGER. Used on most write endpoints (services, service providers, customers).
- `assertOwnerAccess` also used on the BusinessUser create endpoint (OWNER only).
- Outsider (no `BusinessUser` row) → 403.
- Missing auth → 401.
- Non-existent `businessId` → 403 (access assertion fails first, before a 404 is reached).

### Covered endpoints

| Endpoint | Guard | Notes |
| --- | --- | --- |
| `GET /health` | none | DB ping |
| `GET /businesses/me` | ClerkAuthGuard | Returns user's business list |
| `GET /dashboard/businesses/:businessId/services` | assertAccess | |
| `GET /dashboard/businesses/:businessId/customers` | assertAccess | |
| `GET /dashboard/businesses/:businessId/service-providers` | assertAccess | |
| `GET /dashboard/businesses/:businessId/users` | assertOwnerAccess | OWNER only |
| `GET /dashboard/businesses/:businessId/summary` | assertAccess | |
| `GET /dashboard/businesses/:businessId/readiness` | assertAccess | |
| `GET /dashboard/businesses/:businessId/working-hours` | assertAccess | |
| `GET /dashboard/businesses/:businessId/service-providers/:serviceProviderId/working-hours` | assertAccess | |
| `GET /dashboard/businesses/:businessId/availability-exceptions` | assertAccess | |
| `GET /dashboard/businesses/:businessId/appointments` | assertAccess | Supports `from`, `to`, `status` query params |

### Key response shapes

**Readiness** (`GET …/readiness`):

```json
{ "hasActiveServiceProviders": true, "hasActiveService": true, "isReady": true }
```

**Appointment** (`GET …/appointments` items):

```json
{
  "id", "businessId", "businessCustomerId", "customerName",
  "serviceId", "serviceName",
  "serviceProviderId", "serviceProviderName",
  "startsAt", "endsAt", "status",
  "createdAt", "updatedAt"
}
```

### E2E test infrastructure

- Real Prisma + real test DB (`TEST_DATABASE_URL`).
- `requireTestDatabase()` called at module level in every DB-based suite.
- `MockClerkAuthGuard` overrides `ClerkAuthGuard` in test modules.
- `PrismaModule` must be explicitly imported in isolated test modules (it is `@Global()` only when `AppModule` loads it).
- `maxWorkers: 1` in `jest-e2e.json` — suites run serially to avoid DB connection exhaustion.
- Stable deterministic UUID IDs use hex-only prefixes (`e2e50000…`, `e2e60000…`, etc.).
- Seeds clean up in FK-safe order in both `beforeAll` (idempotent pre-cleanup) and `afterAll`.
- Dev seed is never used in tests.

**Current test counts:** 16 e2e suites / 257 tests — 14 unit suites / 158 tests — build clean.

## Domain naming — locked decisions

| Term | Correct name | Rejected name |
| --- | --- | --- |
| Permission role | OWNER / MANAGER / MEMBER | STAFF (removed) |
| Bookable entity | `ServiceProvider` | `StaffMember` (renamed) |
| Route segment | `/service-providers` | `/staff` |
| FK field | `serviceProviderId` | `staffMemberId` |

`ServiceProvider` is a separate entity from `BusinessUser`. A `BusinessUser` is a platform user with a role; a `ServiceProvider` is a bookable profile linked to a `BusinessUser`. The two are not interchangeable.

## Completed — Phase 2: Mutation E2E Tests

Approach: one task per domain, inspect code before assuming DTOs, implement tests only, permission changes explicit and separate.

### Completed domains

#### 1. Services mutations — done

Endpoints covered:

- `POST /dashboard/businesses/:businessId/services`
- `PATCH /dashboard/businesses/:businessId/services/:serviceId`
- `PATCH /dashboard/businesses/:businessId/services/:serviceId/status`

Verified: OWNER/MANAGER allowed; MEMBER/outsider 403; missing auth 401; validation; cross-tenant Pattern A and Pattern B.

#### 2. ServiceProvider mutations — done

Endpoints covered:

- `POST /dashboard/businesses/:businessId/service-providers`
- `PATCH /dashboard/businesses/:businessId/service-providers/:serviceProviderId`
- `PATCH /dashboard/businesses/:businessId/service-providers/:serviceProviderId/status`

Verified: OWNER/MANAGER allowed; MEMBER/outsider 403; missing auth 401; validation; duplicate `businessUserId` behavior; cross-tenant Pattern A and Pattern B.

#### 3. Customers mutations — done

Endpoints covered:

- `POST /dashboard/businesses/:businessId/customers`
- `PATCH /dashboard/businesses/:businessId/customers/:businessCustomerId`
- `PATCH /dashboard/businesses/:businessId/customers/:businessCustomerId/status`

Verified: OWNER/MANAGER allowed; MEMBER/outsider 403; missing auth 401; validation; duplicate customer-in-business behavior; cross-tenant Pattern A and Pattern B.

Note: `CustomerProfile` is a global table (no `businessId`). The tenant-scoped junction is `BusinessCustomer`.

#### 4. BusinessUser mutations — done

Endpoints covered:

- `POST /dashboard/businesses/:businessId/users`

No PATCH/DELETE/role-change/status-change endpoints exist yet.

Verified: OWNER allowed; MANAGER/MEMBER/outsider 403; missing auth 401; invalid DTO cases; OWNER role rejected by DTO; duplicate BusinessUser 409; Pattern A coverage.

**Permission fix applied:** `createBusinessUser` was changed from `assertMutationAccess` to `assertOwnerAccess`. This fixed a mismatch where MANAGER could invite users. Current behavior now matches `docs/rbac.md` (OWNER-only).

#### 5. Working hours mutations — done

Endpoints covered:

- `PUT /dashboard/businesses/:businessId/working-hours`
- `PUT /dashboard/businesses/:businessId/service-providers/:serviceProviderId/working-hours`

Verified: OWNER/MANAGER allowed; MEMBER/outsider 403; missing auth 401; validation (dayOfWeek, isClosed, startTime/endTime); isClosed=true nulls times; cross-tenant Pattern A; SP not in business Pattern B.

#### 6. Availability exceptions mutations — done

Endpoints covered:

- `POST /dashboard/businesses/:businessId/availability-exceptions`
- `PATCH /dashboard/businesses/:businessId/availability-exceptions/:exceptionId`
- `DELETE /dashboard/businesses/:businessId/availability-exceptions/:exceptionId`

Verified: OWNER/MANAGER allowed; MEMBER/outsider 403; missing auth 401; validation; isClosed=false with missing times 400; cross-tenant Pattern A; foreign exceptionId Pattern B; 204 on DELETE.

#### 7. Admin — done

Endpoints covered:

- `POST /admin/businesses/:businessId/owner`

Guards: `ClerkAuthGuard` + `PlatformAdminGuard` (platformRole ADMIN or SUPER_ADMIN required).

Verified: admin → 201; non-admin 403; missing auth 401; missing phone 400; invalid email 400; non-existent businessId 404; business already has owner 409.

Unit coverage added: `AdminBusinessesService` (delegation + error propagation), `AdminBusinessesController` (delegation with guard overrides).

### Pending permission decisions (not yet decided)

- Whether MEMBER can create appointments.
- Whether MEMBER can change appointment status.

These must be decided and documented before writing appointment mutation tests.

## Next — Phase 2 (remaining): Mutation E2E Tests

### Remaining order

1. ~~**Working hours**~~ — done
2. ~~**Availability exceptions**~~ — done
3. **Appointments** — last; depends on all other domain entities and status transition rules

**Appointments are last** because booking validation depends on Business, Customer, Service, ServiceProvider, working hours, availability exceptions, and unresolved MEMBER permission decisions.

### Future business-rule validation — working hours and availability exceptions

Not part of current e2e coverage. Belongs to a future appointment/availability business-rule validation phase.

#### Working hours updates and existing appointments

When an OWNER or MANAGER shortens business or service-provider working hours, future appointments that fall outside the new hours become invalid. The current implementation does not check for this.

Preferred future behavior:

- Return `409 Conflict` and reject the update.
- Include conflict details (which appointments are affected) so the frontend can prompt the user to reschedule before applying the change.
- Do not silently allow a working-hours update that invalidates existing bookings.

Applies to both `PUT …/working-hours` (business-level) and `PUT …/service-providers/:serviceProviderId/working-hours` (SP-level).

#### Availability exceptions and existing appointments

When creating or updating an availability exception, the system should check for future appointments that overlap the affected time/date range.

- **Business-level exception:** check future appointments for the entire business in that date/time range.
- **ServiceProvider-level exception:** check future appointments for that ServiceProvider only.

Preferred future behavior:

- Return `409 Conflict` if overlapping future appointments exist.
- Include conflict details.
- Do not silently create an exception that makes existing bookings invalid.

### Reminder for future mutation tests

- Inspect actual controller/service code first — do not assume route names, DTOs, or response shapes.
- If current behavior differs from the intended permission model, document the gap before changing any code.
- Keep permission changes in a separate task from test additions.
- One domain per task.
- Do not reintroduce `STAFF`, `StaffMember`, or `staffMemberId` naming anywhere.

## Later — Phase 3 and Beyond

- Notifications and outbox (async appointment created/cancelled events).
- Audit logs.
- CI pipeline.
- Staging environment.
- Billing and subscriptions.
- Frontend (Next.js + React under `apps/web`) — separate roadmap.
