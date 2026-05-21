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
- `assertMutationAccess` — OWNER or MANAGER. Used on all write endpoints.
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

**Current test counts:** 9 e2e suites / 67 tests — 13 unit suites / 153 tests — build clean.

## Domain naming — locked decisions

| Term | Correct name | Rejected name |
| --- | --- | --- |
| Permission role | OWNER / MANAGER / MEMBER | STAFF (removed) |
| Bookable entity | `ServiceProvider` | `StaffMember` (renamed) |
| Route segment | `/service-providers` | `/staff` |
| FK field | `serviceProviderId` | `staffMemberId` |

`ServiceProvider` is a separate entity from `BusinessUser`. A `BusinessUser` is a platform user with a role; a `ServiceProvider` is a bookable profile linked to a `BusinessUser`. The two are not interchangeable.

## Next — Phase 2: Mutation E2E Tests

Approach: one task per domain, read code before assuming DTOs, implement tests only, no permission changes without explicit discussion.

### Recommended order

1. **Services** — inspect implemented service mutation endpoints first; test only existing create/update/status/delete routes
2. **Customers** — create, update, change status
3. **Service providers** — create, update, link/unlink services
4. **Business users** — invite/update role (if endpoints exist)
5. **Working hours** — `PUT` business working hours, `PUT` service provider working hours
6. **Availability exceptions** — `POST`, `PATCH`, `DELETE`
7. **Appointments** — last; depends on all other domain entities and status transition rules

**Appointments are last** because booking validation depends on Business, Customer, Service, ServiceProvider, working hours, and availability exceptions all being correct.

### Starting point

Begin with **services mutations** only.

Expected permission model for services mutations:

- OWNER → allowed
- MANAGER → allowed
- MEMBER → 403
- outsider → 403
- missing auth → 401

### Pending permission decisions (not yet tested, not yet decided)

- Whether MEMBER can create appointments.
- Whether MEMBER can change appointment status.
- Whether MEMBER can create or update customers.

These must be decided and documented before writing mutation tests for those domains.

### Reminder for future mutation tests

- Inspect actual controller/service code first — do not assume route names, DTOs, or response shapes.
- If current behavior differs from the intended permission model, document the gap before changing any code.
- Keep permission changes in a separate task from test additions.
- One domain per task.

## Later — Phase 3 and Beyond

- Notifications and outbox (async appointment created/cancelled events).
- Audit logs.
- CI pipeline.
- Staging environment.
- Billing and subscriptions.
- Frontend (Next.js + React under `apps/web`) — separate roadmap.
