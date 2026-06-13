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
| `GET /dashboard/businesses/:businessId/appointments` | assertAccess | Supports `from`, `to`, `status`, `businessCustomerId` query params |

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

**Approximate test counts:** 22+ E2E suites / 400+ tests — 17+ unit suites / 285+ unit tests — lint clean — build clean.

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

**ServiceProvider assignment policy (locked):** Removing a `serviceId` assignment from a `ServiceProvider` does **not** block or cancel existing future appointments for that `(serviceProviderId, serviceId)` pair. Existing appointments remain valid and manageable. The change applies only to new bookings — the available-slots engine queries `ServiceProviderService` at request time. Do not add blocking validation or cascade cancellation to `updateServiceProvider` without an explicit product decision.

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

Verified: OWNER/MANAGER allowed; MEMBER read-only / 403 on all mutations; missing auth 401; DTO validation; past `startsAt` rejection; empty PATCH rejection; terminal status-change protection; time-based status rules; overlap conflict detection (409); availability validation against business hours / SP hours / availability exceptions (400); cross-tenant Pattern A and Pattern B.

**Time-based rules for `PATCH .../status`** (enforced in `setAppointmentStatus`, after terminal-status check):

- `COMPLETED` and `NO_SHOW` require `existing.startsAt <= now` — the appointment must have already started.
- `CANCELLED_BY_BUSINESS` requires `existing.startsAt > now` — the appointment must not have started yet.
- In-progress appointments (started but not ended) may be marked COMPLETED or NO_SHOW but not CANCELLED_BY_BUSINESS.
- Unit tests: 7 new cases added to `appointments.service.spec.ts` covering all combinations.

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

#### PUT business working hours and existing appointments — done

`PUT …/working-hours` (business-level) now rejects with `409 Conflict` when the proposed hours would invalidate any existing future non-cancelled appointment. Conflict details (affected appointment IDs, start/end times, reason) are included in the response body. The delete-then-create transaction is not executed when a conflict is detected. Cancelled appointments (`CANCELLED_BY_CUSTOMER`, `CANCELLED_BY_BUSINESS`) are excluded from the check.

Implemented in `BookingValidationService.checkBusinessHoursConflict`. Called from `AvailabilityService.setBusinessWorkingHours` after access and DTO validation, before the transaction.

#### PUT service-provider working hours and existing appointments — done

`PUT …/service-providers/:id/working-hours` now rejects with `409 Conflict` when the proposed hours would invalidate any existing future non-cancelled appointment for that specific ServiceProvider. Conflict scope is limited to the target SP — other SPs' appointments are not considered. Failed updates do not persist. Cancelled appointments are excluded from the check.

Implemented in `BookingValidationService.checkServiceProviderHoursConflict`. Called from `AvailabilityService.setServiceProviderWorkingHours` after access, SP ownership, and DTO validation, before the transaction.

#### POST / PATCH / DELETE availability exceptions and existing appointments — done

`POST`, `PATCH`, and `DELETE` on availability exceptions now reject with `409 Conflict` when the mutation would invalidate future non-cancelled appointments.

- **POST / PATCH:** `checkAvailabilityExceptionConflict` — queries future appointments filtered to the exception's local date, then checks whether the proposed exception window covers them. Business-level exceptions check all business appointments; SP-level exceptions are scoped to that SP.
- **DELETE:** `checkAvailabilityExceptionDeleteConflict` — simulates world after exception removal by falling back to `businessWorkingHour` (business-level) or `serviceProviderWorkingHour` (SP-level) for the exception's day of week. If the fallback is closed or absent, any appointment on that date becomes a conflict.
- PATCH merges DTO fields with the existing exception values before running the check (effective isClosed / startTime / endTime).
- Conflict details (appointmentId, startsAt, endsAt, reason) are included in the 409 body.
- Cancelled appointments are excluded from all checks.

## Completed — Phase 3: Available Slots Engine

### Available Slots — Phase A: Core service + unit tests — done

New exported helpers added to `BookingValidationService` (`booking-validation.service.ts`):

- `WindowResult` type — exported for use by `AvailableSlotsService`.
- `resolveWindow` — made public (was private); resolves effective availability window for a date by checking exceptions first, then falling back to working hours.
- `dayOfWeekFromLocalDate(localDate: string): number` — pure calendar helper; uses `new Date(localDate + 'T12:00:00Z').getUTCDay()`. Returns the JS `Date.getDay()` value from a local YYYY-MM-DD string without timezone conversion (the date is already business-local, so day-of-week is a calendar arithmetic question).
- `localMinutesToUtc(localDate, localMinutes, timezone): Date` — noon-probe algorithm: samples at noon UTC (always same calendar date in any timezone) to determine the local offset, then computes local midnight in UTC and adds the requested minute offset. Handles DST correctly for all supported timezones.

New service `AvailableSlotsService` (`available-slots.service.ts`):

- `getAvailableSlots(userId, businessId, query)` — validates access, service, ServiceProvider, SP user status, and SP-service link; resolves biz and SP windows; intersects them; generates candidate slots by `intervalMinutes`; filters out slots overlapping any non-cancelled appointment (half-open interval: `apt.startsAt < slotEnd && apt.endsAt > slotStart`); returns typed `AvailableSlotsResponseDto`.
- `assertAccess` — returns `{ timezone }` in addition to enforcing membership and business status; timezone comes from `Business.timezone` (default `"Asia/Jerusalem"`).
- `Service.bufferBeforeMin` / `bufferAfterMin` ignored for v1 consistency with current appointment code.

New DTO `AvailableSlotsQueryDto` (`dto/available-slots-query.dto.ts`): `serviceId` (`@IsUUID`), `serviceProviderId` (`@IsUUID`), `date` (`@Matches /^\d{4}-\d{2}-\d{2}$/`), `intervalMinutes` (optional `@IsInt @Min(1)`, default 15).

Unit tests: 15 tests in `available-slots.service.spec.ts`. New helper tests added to `booking-validation.service.spec.ts`: 3 for `dayOfWeekFromLocalDate`, 3 for `localMinutesToUtc` (Asia/Jerusalem UTC+3, UTC, round-trip via `toLocalDate`).

### Available Slots — Phase B: HTTP endpoint + E2E coverage — done

New controller `AvailableSlotsController` (`available-slots.controller.ts`):

- `GET /dashboard/businesses/:businessId/available-slots`
- Guarded by `ClerkAuthGuard`.
- Query params: `serviceId`, `serviceProviderId`, `date` (YYYY-MM-DD local date), `intervalMinutes` (optional, default 15).
- All three roles (OWNER, MANAGER, MEMBER) can read available slots via `assertAccess`.
- Missing auth → 401. Outsider → 403. Non-existent `businessId` → 403. Foreign `serviceId` → 404. Foreign `serviceProviderId` → 404. Inactive SP or service → 400. SP does not offer service → 400.

Response shape:

```json
{
  "date": "YYYY-MM-DD",
  "timezone": "Asia/Jerusalem",
  "serviceId": "...",
  "serviceProviderId": "...",
  "durationMinutes": 60,
  "intervalMinutes": 15,
  "slots": [
    { "startsAt": "...", "endsAt": "...", "localStartTime": "HH:MM", "localEndTime": "HH:MM" }
  ]
}
```

Registered in `DashboardModule` (controller + provider).

E2E coverage: `dashboard-available-slots.e2e-spec.ts` — 7 tests, UUID prefix `e2e14000`.

| Test | Assertion |
| --- | --- |
| OWNER → 200 with correct shape | response fields + slot object shape |
| MEMBER → 200 | read access permitted |
| Missing auth → 401 | |
| Outsider → 403 | |
| Foreign `serviceProviderId` → 404 | Pattern B isolation |
| Active appointment removes overlapping slot | `localStartTime: '09:00'` absent |
| Cancelled appointment does not remove slot | `localStartTime: '11:00'` present |

**Date precision note:** Test date `2030-07-01` was verified at runtime as Monday (dayOfWeek=1) via `new Date('2030-07-01T12:00:00Z').getUTCDay() === 1`. An earlier candidate `2030-07-07` was found to be Sunday (dayOfWeek=0) — seeded working hours for dayOfWeek=1 would never match, producing zero slots. The switch to `2030-07-01` corrected the failure. This confirms the importance of verifying assumed day-of-week values with `dayOfWeekFromLocalDate` or equivalent before seeding E2E working-hours fixtures.

### Reminder for future mutation tests

- Inspect actual controller/service code first — do not assume route names, DTOs, or response shapes.
- If current behavior differs from the intended permission model, document the gap before changing any code.
- Keep permission changes in a separate task from test additions.
- One domain per task.
- Do not reintroduce `STAFF`, `StaffMember`, or `staffMemberId` naming anywhere.

## Completed — Phase 4: Public Booking Read Endpoints

Four unauthenticated read endpoints under `/public/businesses/:slug/`. No auth guard is required; routes without `@UseGuards()` are public by default in this app.

### Architecture: SlotsEngineModule (neutral shared module)

To share slot computation between the authenticated dashboard and the public surface without coupling the two modules:

- **`SlotsEngineModule`** (`src/slots-engine/`) is a neutral NestJS module that provides and exports:
  - `AvailableSlotsEngineService` — owns `computeSlots(businessId, timezone, query)`, the full slot calculation logic (service/SP validation, window resolution, conflict filtering, slot generation). No auth, no membership check, no slug resolution.
  - `BookingValidationService` — moved here from `DashboardModule.providers` (file stays in `src/dashboard/`; only the NestJS module registration moved). No import paths in existing dashboard services changed.
- **`DashboardModule`** imports `SlotsEngineModule`. `AvailableSlotsService` is now a thin auth wrapper: calls `assertAccess(userId, businessId)` to resolve the timezone and enforce membership + business status, then delegates to `engine.computeSlots`.
- **`PublicModule`** imports `SlotsEngineModule` only — no dependency on `DashboardModule`. `PublicSlotsService` resolves the business by slug (via `PublicBusinessesService.findActiveBusinessBySlug`), then calls `engine.computeSlots` directly.

### Endpoints

| Endpoint | Access | Notes |
| --- | --- | --- |
| `GET /public/businesses/:slug` | none | Business profile (id, name, slug, timezone, locale, currency). Status field omitted from response. |
| `GET /public/businesses/:slug/services` | none | Active services only (`isActive: true`). Returns id, name, description, durationMinutes, priceCents. |
| `GET /public/businesses/:slug/service-providers` | none | Active providers only (`isActive: true` and linked businessUser `status: ACTIVE`). Returns id, displayName only. |
| `GET /public/businesses/:slug/available-slots` | none | Same query params and response shape as the dashboard version. Reuses `AvailableSlotsEngineService.computeSlots`. |

### Access rules (all four endpoints)

- Business `status` not `ACTIVE` or `TRIAL` → 404 (same response as unknown slug — callers cannot distinguish).
- Unknown slug → 404.
- Inactive service passed as `serviceId` to available-slots → 400.
- Inactive SP passed as `serviceProviderId` to available-slots → 400.
- SP does not offer the selected service → 400.

### Key files

| File | Role |
| --- | --- |
| `src/slots-engine/slots-engine.module.ts` | Neutral module; provides and exports `BookingValidationService` + `AvailableSlotsEngineService` |
| `src/slots-engine/available-slots-engine.service.ts` | `computeSlots(businessId, timezone, query)` — shared slot computation |
| `src/slots-engine/available-slots-engine.service.spec.ts` | Unit tests for the engine (11 tests) |
| `src/dashboard/available-slots.service.ts` | Auth wrapper: `assertAccess` → `engine.computeSlots` |
| `src/dashboard/available-slots.service.spec.ts` | Unit tests for auth wrapper only (4 tests) |
| `src/public/public.module.ts` | PublicModule — imports PrismaModule + SlotsEngineModule only |
| `src/public/public-businesses.controller.ts` | Single controller for all four public routes |
| `src/public/public-businesses.service.ts` | Profile, services, service-providers queries; `findActiveBusinessBySlug` helper |
| `src/public/public-slots.service.ts` | Slug resolution → `engine.computeSlots` |
| `src/public/dto/` | `PublicBusinessProfileDto`, `PublicServiceDto`, `PublicServiceProviderDto` |
| `test/e2e/public-businesses.e2e-spec.ts` | E2E coverage — 14 tests, UUID prefix `e2e15000` |

### E2E coverage

`public-businesses.e2e-spec.ts` — 14 tests. No `MockClerkAuthGuard` needed (routes are unauthenticated). Test module imports `PrismaModule` + `PublicModule` directly (no `AppModule`).

| Suite | Tests |
| --- | --- |
| `GET /public/businesses/:slug` | 200 correct shape; 404 unknown slug; 404 suspended business |
| `GET /public/businesses/:slug/services` | 200 with active-only filter; correct shape; 404 unknown slug |
| `GET /public/businesses/:slug/service-providers` | 200 with active-only filter; correct shape; 404 unknown slug |
| `GET /public/businesses/:slug/available-slots` | 200 correct shape with slots; 404 unknown slug; 404 suspended; 400 inactive service; 400 inactive SP |

## Completed — Phase 5: Backend Hardening

Applied after Phase 2 mutation E2E phases. No new endpoints; validates invariants in existing `createServiceProvider`, `updateServiceProvider`, and `createAppointment`.

### ServiceProvider activation invariants

`createServiceProvider` and both `updateServiceProvider` + `/status` now reject activation when:

- No services are assigned.
- Any assigned service is inactive (`isActive: false`).
- The linked `BusinessUser` is not `ACTIVE` (checked only on activation, not on deactivation).

`updateServiceProvider` enforces the inactive-service invariant in two scenarios:

1. **`serviceIds` present in payload** — validates the incoming list before committing.
2. **`serviceIds` absent from payload, `isActive: true`** — queries existing `ServiceProviderService` links and rejects if any linked service is currently inactive.

This prevents a `ServiceProvider` from being activated when it holds stale links to services that were deactivated after the original assignment.

E2E coverage added to `dashboard-service-providers.e2e-spec.ts` for: create with `isActive: true` + inactive service → 400; update without `serviceIds` + activate + inactive existing service → 400.

### Customer activity check on appointment creation

`createAppointment` now rejects if the `BusinessCustomer` status is not `ACTIVE`, with `BadRequestException('Customer is not active')`.

This prevents creating appointments for blocked or archived customers even if the caller knows their ID.

E2E coverage added to `dashboard-appointments.e2e-spec.ts`: appointment create with BLOCKED customer → 400.

### Customer appointment history filter

`GET …/appointments` now accepts an optional `businessCustomerId` (`@IsUUID`, `@IsOptional`) query parameter. When provided, the Prisma `where` clause adds `businessCustomerId: query.businessCustomerId`. Existing `from`/`to`/`status` filters are unaffected.

This supports the customer history feature: the frontend fetches past appointments filtered by customer without a separate endpoint.

E2E coverage added to `dashboard-appointments.e2e-spec.ts`: `businessCustomerId` filter returns only that customer's appointments (1 result); unknown `businessCustomerId` returns empty list. Suite: 11/11 passing.

## Later — Phase 3 and Beyond

- Notifications and outbox (async appointment created/cancelled events).
- Audit logs.
- CI/CD polish and staging deployment (CI already runs unit tests, E2E tests, lint, and build via GitHub Actions).
- Staging environment.
- Billing and subscriptions.
- Frontend (Next.js + React under `apps/web`): Business App CRUD is stable across all five tabs — see `CLAUDE.md` § "Current Business App Frontend Status". Next frontend focus areas: public booking flow, notifications UI, billing UI.
