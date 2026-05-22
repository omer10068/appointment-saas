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

#### Status enforcement (all three helpers)

Both the `BusinessUser` status and the `Business` status are enforced inside every access helper, in this order:

1. **BusinessUser.status** — membership must exist and be `ACTIVE`. `INVITED` and `BLOCKED` members receive 403. Checked first; a failing status short-circuits before the business query runs.
2. **Business.status** — business must be `ACTIVE` or `TRIAL`. `SUSPENDED` and `CANCELLED` businesses receive 403.

Covered by:

- `dashboard-business-user-status.e2e-spec.ts` — 6 tests across assertAccess / assertMutationAccess / assertOwnerAccess
- `dashboard-business-status.e2e-spec.ts` — 6 tests across the same three helpers

### Covered endpoints

| Endpoint | Guard | Notes |
| --- | --- | --- |
| `GET /health` | none | DB ping |
| `GET /businesses/me` | ClerkAuthGuard | Returns user's business list |
| `GET /dashboard/businesses/:businessId` | assertAccess | Business settings; slug/status/id/timestamps read-only |
| `PATCH /dashboard/businesses/:businessId` | assertMutationAccess | Updates name, timezone, locale, currency; empty body → 400 |
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

**Business settings** (`GET …/:businessId` and `PATCH …/:businessId`):

```json
{ "id", "name", "slug", "status", "timezone", "locale", "currency", "createdAt", "updatedAt" }
```

Covered by `dashboard-business-settings.e2e-spec.ts` (16 tests: 6 GET + 10 PATCH).

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

**Current test counts:** 20 E2E suites / 358 tests — 14 unit suites / 197 tests — build clean.

## Domain naming — locked decisions

| Term | Correct name | Rejected name |
| --- | --- | --- |
| Permission role | OWNER / MANAGER / MEMBER | STAFF (removed) |
| Bookable entity | `ServiceProvider` | `StaffMember` (renamed) |
| Route segment | `/service-providers` | `/staff` |
| FK field | `serviceProviderId` | `staffMemberId` |

`ServiceProvider` is a separate entity from `BusinessUser`. A `BusinessUser` is a platform user with a role; a `ServiceProvider` is a bookable profile linked to a `BusinessUser`. The two are not interchangeable.

## Implementation conventions

### Working-hours dayOfWeek encoding

The `dayOfWeek` integer on `BusinessWorkingHour` and `ServiceProviderWorkingHour` follows the JavaScript `Date.getDay()` convention:

| Value | Day |
| --- | --- |
| 0 | Sunday |
| 1 | Monday |
| 2 | Tuesday |
| 3 | Wednesday |
| 4 | Thursday |
| 5 | Friday |
| 6 | Saturday |

This does **not** match ISO-8601 (Monday = 1 … Sunday = 7), Google Calendar's weekday enum, or iCalendar's `BYDAY` field. Any future external-calendar integration must use an adapter/helper to convert between the internal encoding and the external format. Do not assume they match.

### Timezone handling for availability

`Business.timezone` (IANA timezone string, e.g. `"Asia/Jerusalem"`) is the single source of truth for:

- Converting a UTC `startsAt` timestamp to a local calendar date for availability-exception matching.
- Determining the local day-of-week for working-hours lookup.
- Computing minutes-since-midnight for window-boundary checks.

All timezone-sensitive operations use `Intl.DateTimeFormat` with no external date-time library. Slot validation checks the full appointment duration (`startsAt` through `endsAt`), not only `startsAt`.

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
- `PATCH /dashboard/businesses/:businessId/users/:businessUserId/role`
- `PATCH /dashboard/businesses/:businessId/users/:businessUserId/status`

DELETE/removal is intentionally not implemented yet. Deactivating a user from dashboard access is represented by setting `status = BLOCKED`.

**POST** — Verified: OWNER allowed; MANAGER/MEMBER/outsider 403; missing auth 401; invalid DTO cases; OWNER role rejected by DTO; duplicate BusinessUser 409; Pattern A coverage.

**Permission fix applied:** `createBusinessUser` was changed from `assertMutationAccess` to `assertOwnerAccess`. This fixed a mismatch where MANAGER could invite users. Current behavior now matches `docs/rbac.md` (OWNER-only).

**PATCH role** — Body accepts `role: MEMBER | MANAGER` only. OWNER cannot be assigned through this endpoint. Guard: `assertOwnerAccess`.

Safety rules enforced:

- Target whose current role is OWNER → 400.
- Caller attempting to change their own role → 400.
- Foreign `businessUserId` scoped by `businessId` → 404 (Pattern B isolation).

Verified: OWNER → 200; MANAGER/MEMBER/outsider 403; missing auth 401; non-existent businessId 403; Pattern B 404; target-OWNER 400.

**PATCH status** — Body accepts `status: ACTIVE | BLOCKED` only. `INVITED` is not settable from the dashboard. Guard: `assertOwnerAccess`.

Safety rules enforced:

- Caller attempting to change their own status → 400.
- Blocking an OWNER when they are the last active OWNER in the business → 400.
- Foreign `businessUserId` scoped by `businessId` → 404 (Pattern B isolation).

Verified: OWNER → 200; MANAGER/MEMBER/outsider 403; missing auth 401; non-existent businessId 403; Pattern B 404; self-block 400.

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

#### 8. Appointments mutations — done

Endpoints covered (57 tests):

- `POST /dashboard/businesses/:businessId/appointments`
- `PATCH /dashboard/businesses/:businessId/appointments/:appointmentId`
- `PATCH /dashboard/businesses/:businessId/appointments/:appointmentId/status`

Verified: OWNER/MANAGER allowed; MEMBER read-only / 403 on all mutations; missing auth 401; DTO validation; past `startsAt` rejection; empty PATCH rejection; terminal status-change protection; overlap conflict detection (409); availability validation against business hours / SP hours / availability exceptions (400); cross-tenant Pattern A and Pattern B.

Appointment create and update enforce two independent validation layers in this order:

1. **Occupancy check** (`checkServiceProviderConflict`): rejects if any non-cancelled appointment for the same ServiceProvider overlaps the slot. Returns 409 Conflict.
2. **Availability validation** (`BookingValidationService.validateBookingSlot`): validates the full duration (`startsAt` → `endsAt`) against business working hours, service-provider working hours, and availability exceptions (business-level then SP-level). Returns 400 Bad Request.

The conflict check fires first; the availability check runs only when no overlap is found. `PATCH …/status` does not re-validate availability — status changes do not move the slot.

### Permission decisions — resolved

- **MEMBER cannot create appointments.** All appointment mutations use `assertMutationAccess` (OWNER/MANAGER only).
- **MEMBER cannot change appointment status.** Same guard.
- MEMBER retains read access via `assertAccess` on `GET .../appointments`.
- Scoped MEMBER appointment actions (e.g. only their own SP calendar) may be revisited in a later phase. Document in `docs/rbac.md`.

### Availability hardening — remaining future work

Booking-time availability validation (validating a new or updated appointment slot against working hours and exceptions) is **done** — see appointments section above.

The following mutation-time checks are **not yet implemented**: rejecting a working-hours or exception change when it would invalidate existing future appointments.

#### PUT working hours and existing appointments

When an OWNER or MANAGER shortens business or service-provider working hours, future appointments that fall outside the new hours become invalid. The current implementation does not check for this.

Preferred future behavior:

- Return `409 Conflict` and reject the update.
- Include conflict details (which appointments are affected) so the frontend can prompt the user to reschedule before applying the change.
- Do not silently allow a working-hours update that invalidates existing bookings.

Applies to both `PUT …/working-hours` (business-level) and `PUT …/service-providers/:serviceProviderId/working-hours` (SP-level).

#### POST / PATCH / DELETE availability exceptions and existing appointments

When creating, updating, or deleting an availability exception, the system should check for future appointments that overlap the affected date/time range.

- **Business-level exception:** check future appointments for the entire business on that date.
- **ServiceProvider-level exception:** check future appointments for that ServiceProvider only.

Preferred future behavior:

- Return `409 Conflict` if overlapping future appointments exist.
- Include conflict details.
- Do not silently create or update an exception that makes existing bookings invalid.

### Reminder for future mutation tests

- Inspect actual controller/service code first — do not assume route names, DTOs, or response shapes.
- If current behavior differs from the intended permission model, document the gap before changing any code.
- Keep permission changes in a separate task from test additions.
- One domain per task.
- Do not reintroduce `STAFF`, `StaffMember`, or `staffMemberId` naming anywhere.

## Later — Phase 3 and Beyond

- Notifications and outbox (async appointment created/cancelled events).
- Audit logs.
- CI/CD polish and staging deployment (CI already runs unit tests, E2E tests, lint, and build via GitHub Actions).
- Staging environment.
- Billing and subscriptions.
- Frontend (Next.js + React under `apps/web`) — separate roadmap.
