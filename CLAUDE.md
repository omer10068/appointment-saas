# Claude Code Instructions

## Product

This is a closed multi-tenant B2B SaaS for appointment scheduling.

Platform admins create businesses manually.
Business owners cannot self-register.
End customers can access only businesses that explicitly added them and did not block them.

## Stack

- Monorepo: pnpm + Turborepo
- Backend: NestJS + TypeScript
- Database: PostgreSQL
- ORM: Prisma 7
- Authentication: Clerk
- Testing: Jest + Supertest; DB-based e2e tests run against a real PostgreSQL test database
- Local infrastructure: Docker Compose
- Frontend: Next.js + React + TypeScript (in progress, under `apps/web`)
- Shared contracts: `packages/contracts`
- Architecture: Modular Monolith

## Current Backend Foundation

- API app lives under `apps/api`.
- PostgreSQL runs locally via Docker Compose.
- Prisma schema lives under `apps/api/prisma/schema.prisma`.
- Prisma config lives under `apps/api/prisma.config.ts`.
- Prisma Client is generated into `apps/api/src/generated/prisma`.
- Generated Prisma Client must not be committed to Git.
- Prisma 7 uses `moduleFormat = "cjs"` for NestJS/CommonJS compatibility.
- NestJS uses `@nestjs/config` to load `.env`.
- Authentication uses Clerk via `ClerkAuthGuard`.
- Automated e2e tests override `ClerkAuthGuard` with `MockClerkAuthGuard`.
- DB-based e2e tests use a real test database and must call `requireTestDatabase()`.
- E2E tests are serialized with `maxWorkers: 1` to avoid DB connection exhaustion.
- Backend code should use Prisma generated enums where available.

## Domain Naming Rules

These names are locked. Do not reintroduce old names.

| Concept | Correct name | Rejected name |
| --- | --- | --- |
| Permission role | OWNER / MANAGER / MEMBER | STAFF (removed) |
| Bookable entity | `ServiceProvider` | `StaffMember` (renamed) |
| Route segment | `/service-providers` | `/staff` |
| FK field | `serviceProviderId` | `staffMemberId` |

- `MEMBER` is a `BusinessUser` permission role — not a bookable entity.
- `ServiceProvider` is the bookable calendar entity that can receive appointments. It may be linked to a `BusinessUser` but is not the same thing as `MEMBER`.
- Do not use `staffMemberId` or `StaffMember` anywhere in new code.

## Permission Rules

- `assertAccess` — any `BusinessUser` (OWNER, MANAGER, MEMBER). Used on most dashboard read endpoints.
- `assertOwnerAccess` — OWNER only. Used on user-management endpoints.
- `assertMutationAccess` — OWNER or MANAGER. Used by current write endpoints where implemented; inspect the actual controller/service code before assuming permissions.
- Outsider (authenticated but no `BusinessUser` row for that business) → 403.
- Missing auth → 401.
- Non-existent `businessId` → 403 when access assertion runs first.

Role intent:

- **OWNER**: full business access — settings, users, billing, everything.
- **MANAGER**: operational access — services, customers, appointments, service providers, working hours. Cannot manage users, roles, ownership, or billing.
- **MEMBER**: can read dashboard data. Should not manage users, roles, services, service providers, working hours, availability, business settings, or billing unless explicitly decided and documented.

`GET /dashboard/businesses/:businessId/users` is **OWNER-only** (`assertOwnerAccess`).

Unresolved permission decisions (do not implement without explicit instruction):

- Whether MEMBER can create appointments.
- Whether MEMBER can change appointment status.
- Whether MEMBER can create or update customers.

**Do not change permission behavior while adding tests unless explicitly requested.**

## Prisma / Enum Rules

- In `apps/api` backend logic and test code, prefer Prisma generated enums over string literals where available.
- Examples: `BusinessUserRole.OWNER`, `BusinessUserRole.MANAGER`, `BusinessUserRole.MEMBER`, `AppointmentStatus.SCHEDULED`, `UserStatus.ACTIVE`, `CustomerStatus.ACTIVE`, `BusinessUserStatus.ACTIVE`.
- Do not edit files inside `apps/api/src/generated/` directly.
- Do not commit `apps/api/src/generated/`.

## Core Architecture Rules

- Every business-owned table must include `businessId`.
- Do not trust `businessId` from the client.
- Tenant isolation must be enforced in backend guards/services.
- Keep backend domains separated by NestJS modules inside the same API app.
- Do not split the backend into microservices at this stage.
- Avoid distributed-system complexity unless explicitly required later.
- Do not send emails/SMS directly inside critical request flows.
- Use outbox/event pattern for async actions later.

## Coding Rules

- Keep changes small and focused.
- Do not refactor unrelated files.
- Do not introduce `any` unless explicitly justified.
- Do not use `// @ts-ignore` unless there is no reasonable alternative.
- Do not touch `.env`, secrets, or production config unless explicitly requested.
- Prefer DTO validation with `class-validator`.
- Prefer service/use-case methods over business logic in controllers.
- Always run build/lint after meaningful changes.

## Testing Rules

E2E test files live under `apps/api/test/e2e/`. Helpers live under `apps/api/test/helpers/`.

Key helpers:

- `create-test-app.ts` — bootstraps a NestJS test app.
- `mock-clerk-auth.guard.ts` — `MockClerkAuthGuard` with static `currentUser`; reset in `beforeEach`.
- `test-db.ts` — `requireTestDatabase()` aborts a suite if `TEST_DATABASE_URL` is not set.

Rules:

- DB-based e2e suites must call `requireTestDatabase()` at module level.
- Use real Prisma and the real test DB for endpoint e2e tests. Do not mock the database.
- Do not use real Clerk JWTs in automated tests — use `MockClerkAuthGuard`.
- Seed minimal deterministic data inside each suite's `beforeAll`.
- Use valid UUID-formatted deterministic IDs only (hex characters 0-9 and a-f in all segments).
- Add cross-tenant fixtures where tenant isolation needs proof.
- Clean up in FK-safe order in both idempotent pre-cleanup (`beforeAll`) and `afterAll`.
- Do not rely on the dev seed.
- Keep e2e suites serialized — `maxWorkers: 1` in `jest-e2e.json`.
- `PrismaModule` must be explicitly imported in isolated test modules (it is `@Global()` only when `AppModule` loads it).

Expected HTTP responses:

- Missing auth → 401.
- Authenticated outsider / non-member → 403.
- Non-existent `businessId` → 403 when `assertAccess` / `assertOwnerAccess` runs first.

## Current Backend Testing Status

All backend mutation phases are complete. Do not treat any mutation domain as pending.

- All dashboard mutation E2E coverage is green: services, service providers, customers, business users, working hours, availability exceptions, and appointments.
- Appointment status endpoint enforces time-based rules in addition to RBAC and terminal-status protection: COMPLETED and NO_SHOW require the appointment to have already started; CANCELLED_BY_BUSINESS requires it has not yet started.
- Available-slots engine (dashboard + public) is complete and covered by E2E tests.
- Public booking read endpoints (`/public/businesses/:slug/…`) are complete.
- Backend hardening (applied after mutation E2E phases):
  - `createServiceProvider` rejects `isActive: true` when any linked service is inactive.
  - `updateServiceProvider` enforces the inactive-service invariant even when `serviceIds` are absent from the payload (checks existing links before activation).
  - `createAppointment` rejects a non-ACTIVE `BusinessCustomer` with `BadRequestException('Customer is not active')`.
  - E2E coverage added for SP inactive-service activation/update paths and customer-activity check on appointment creation.
- Admin/Ops business lifecycle (Step 1 — Phase A):
  - `BusinessStatus.DRAFT` added to the enum. Schema default remains `TRIAL` to avoid breaking test seeds; service layer enforces `DRAFT` explicitly.
  - `publicBookingEnabled Boolean @default(false)` added to the `Business` table.
  - `BusinessesService.create` always forces `status: BusinessStatus.DRAFT` — this is the single enforcement point for admin-created businesses.
  - `publicBookingEnabled` is intentionally not in `CreateBusinessDto`; it starts `false` and requires a separate admin activation step (Phase B, not yet built).
  - `CreateBusinessDto` now requires `timezone` (`@IsString @IsNotEmpty @MaxLength(100)`); missing or empty timezone → 400.
  - Public booking gate (`findActiveBusinessBySlug`) now requires both `status IN [ACTIVE, TRIAL]` **and** `publicBookingEnabled = true`. DRAFT status or `publicBookingEnabled: false` → 404 (indistinguishable from unknown slug).
  - `assertAccess` (dashboard) still allows only `ACTIVE | TRIAL` — a DRAFT business returns 403 to all dashboard users until it is activated (Phase B).
  - E2E coverage: `admin-businesses.e2e-spec.ts` +5 tests (201 with DRAFT/false defaults, timezone validation, non-admin 403, missing auth 401); `public-businesses.e2e-spec.ts` +6 tests (all visibility gate combinations: DRAFT×false, DRAFT×true, TRIAL×false, ACTIVE×false → 404; TRIAL×true → 200; ACTIVE×true → 200).
- Admin/Ops business lifecycle (Step 2 — owner ACTIVE fix):
  - `createOwnerForBusiness` now creates the `BusinessUser` with `status: BusinessUserStatus.ACTIVE` instead of `INVITED`.
  - The underlying `User` record is still created with `status: UserStatus.INVITED` (identity verification state is separate from business membership state).
  - Dashboard-invited users (created via `POST /dashboard/businesses/:businessId/users`) remain `INVITED` — that path is unchanged.
  - This eliminates the deadlock where admin-created owners could not access the dashboard because `assertAccess` requires `BusinessUser.status = ACTIVE`.
  - E2E coverage: `admin-businesses.e2e-spec.ts` +2 regression tests (owner status ACTIVE assertion; owner can call dashboard endpoint → 200).
- Admin/Ops business lifecycle (Step 2.5 — DRAFT → TRIAL transition):
  - `DRAFT` is the admin-only shell state: no dashboard access for anyone, business not publicly visible.
  - `TRIAL` is the onboarding state: dashboard access unlocked for ACTIVE business users; public booking still blocked because `publicBookingEnabled` remains `false`.
  - `PATCH /admin/businesses/:businessId/status` with `{ "status": "TRIAL" }` moves a DRAFT business to TRIAL.
  - Only `TRIAL` is accepted; `ACTIVE`, `SUSPENDED`, `CANCELLED` → 400 (DTO-level enum validation). Attempting this on a non-DRAFT business → 409.
  - `publicBookingEnabled` is not touched by this endpoint — it remains `false`.
  - `assertAccess` (dashboard) already allows `TRIAL` businesses, so no dashboard code changed.
  - E2E coverage: `admin-businesses.e2e-spec.ts` +9 tests (200 with TRIAL status; publicBookingEnabled remains false; owner can access dashboard; public booking still 404; 403/401/404/400/409 guards).
- ServiceProvider creation boundary (Step 2.6): Dashboard `POST .../service-providers` throws 403 for all callers. Admin-only `POST /admin/businesses/:businessId/service-providers` endpoint added. Frontend FAB and `ProviderCreateSheet` removed from team tab.
- Admin/Ops business lifecycle (Step 3 — detailed readiness check):
  - `GET /dashboard/businesses/:businessId/readiness` extended with 7-check structured response + `blockingReasons` array. Legacy fields (`hasActiveServiceProviders`, `hasActiveService`, `isReady`) preserved.
  - `GET /admin/businesses/:businessId/readiness` added (platform admin only; 404 if business not found).
  - Readiness computed by shared `computeBusinessReadiness(prisma, businessId)` in `readiness.utils.ts`.
  - 7 checks: `hasActiveOwner`, `hasActiveService`, `hasActiveServiceProvider`, `hasBusinessWorkingHours`, `allActiveProvidersHaveWorkingHours`, `allActiveProvidersHaveActiveServiceAssignment`, `allActiveServicesHaveActiveProviderAssignment`.
  - E2E: `dashboard-readiness.e2e-spec.ts` (10 scenario tests); `admin-businesses.e2e-spec.ts` +5 tests. Existing `dashboard-summary-readiness.e2e-spec.ts` updated with working hours in fixture and new field assertions.
- Admin/Ops business lifecycle (Step 4 — TRIAL → ACTIVE activation):
  - `PATCH /admin/businesses/:businessId/status` now accepts `TRIAL` or `ACTIVE` (DTO extended from TRIAL-only).
  - DRAFT → TRIAL: allowed without readiness check (unchanged).
  - TRIAL → ACTIVE: allowed only if `computeBusinessReadiness` returns `isReady === true`; otherwise 400 with blocking reasons.
  - DRAFT → ACTIVE: forbidden → 409. ACTIVE → ACTIVE: conflict → 409. Sending SUSPENDED/CANCELLED → 400 (DTO enum validation).
  - `publicBookingEnabled` is NOT changed by this endpoint — remains `false` after activation.
  - `setBusinessStatus(businessId, targetStatus)` replaces `moveDraftToTrial` in `AdminBusinessesService`.
  - DTO class renamed `SetBusinessStatusDto` (backward-compat alias `SetBusinessTrialDto` kept).
  - E2E: `admin-businesses.e2e-spec.ts` +8 tests (44 total); activation describe block seeds a fully configured TRIAL business and resets to TRIAL in `beforeEach`.
- Admin/Ops business lifecycle (Step 5 — publicBookingEnabled toggle):
  - `PATCH /admin/businesses/:businessId/public-booking` added (platform admin only).
  - Disabling (`publicBookingEnabled: false`): always allowed for any business status, no readiness check.
  - Enabling (`publicBookingEnabled: true`): requires `business.status` to be `TRIAL` or `ACTIVE` (DRAFT → 409) AND `computeBusinessReadiness` returns `isReady === true` (otherwise → 400).
  - Does not change `business.status` in either direction.
  - Public booking is live only when `status IN [TRIAL, ACTIVE]` AND `publicBookingEnabled = true`. ACTIVE alone is not enough.
  - `setPublicBookingEnabled(businessId, enabled)` added to `AdminBusinessesService`.
  - `SetBusinessPublicBookingDto` (`@IsBoolean publicBookingEnabled`) added in `src/admin/dto/`.
  - E2E: `admin-businesses.e2e-spec.ts` +17 tests (61 total).
- Phase B — Admin/Ops Onboarding Convenience:
  - Goal: allow Admin to onboard a new business during DRAFT phase before moving to TRIAL.
  - Phase B.1 — Admin create service:
    - `POST /admin/businesses/:businessId/services` added (platform admin only, no business status check).
    - Works on DRAFT businesses — critical for onboarding because ServiceProvider creation requires serviceIds.
    - Reuses `CreateServiceDto` (same DTO as dashboard); same response shape as dashboard `ServiceDto`.
    - No Prisma schema changes. Dashboard service creation behavior unchanged.
    - `createService(businessId, dto)` added to `AdminBusinessesService`.
    - Admin-created services are visible via dashboard after DRAFT→TRIAL and contribute to readiness.
    - E2E: `admin-businesses.e2e-spec.ts` +12 tests (73 total); covers DRAFT creation, inactive service, DTO validation, 404/403/401, dashboard visibility, tenant isolation, readiness contribution.
- Approximate test counts: 23+ E2E suites / 485+ tests, 17+ unit suites / 293+ unit tests.
- Next backend focus areas: Phase B.2 (admin add business user), Phase B.3 (admin working hours), notifications/outbox, audit logs, billing — see `docs/backend-roadmap.md`.

## Frontend Route Architecture

Four product surfaces — each with a distinct route namespace:

| Surface | Route | Status |
| --- | --- | --- |
| Marketing site | `/` | Placeholder — redirects to `/app/home` until a real marketing page is built |
| Public Booking | `/book/[businessSlug]` | Planned — where customers choose service/provider/time and book |
| Business App | `/app/*` | Live |
| Internal Admin | `/admin/*` | Placeholder (`פאנל ניהול פנימי`) |

Legacy routes (`/home`, `/calendar`, `/dashboard/*`, `/mobile/*`, `/team`, `/availability`) all redirect permanently to their `/app/*` equivalents via `next.config.ts`. No chains.

## Current Business App Frontend Status

Business App CRUD is stable. All five tabs are live and role-gated under the `/app/*` namespace.

Live routes:

- `/app/home`
- `/app/calendar`
- `/app/customers`
- `/app/services`
- `/app/settings` (hub page)
  - `/app/settings/business-hours`
  - `/app/settings/exceptions`
  - `/app/settings/provider-hours`
  - `/app/settings/team`

Bottom nav tabs: Home, Calendar, Customers, Services, Settings. All active, no "coming soon" overlays.

Role behavior across all tabs:

- **OWNER**: full create/edit on customers, services, team; create + manage appointments on calendar and home.
- **MANAGER**: same as OWNER on customers, services, calendar; can edit existing `ServiceProvider`s on team but has no create FAB.
- **MEMBER**: read-only on all tabs — no create or edit sheets are mounted.

Team tab specifics:

- ServiceProvider creation is admin/ops-only. No FAB or create sheet exists in the business app. The team tab is read/edit-only for all roles.
- OWNER and MANAGER see `ProviderEditSheet` when tapping a provider row. MEMBER sees read-only `ProviderDetailSheet`.
- `GET /dashboard/businesses/:businessId/users` is OWNER-only. The `useAppBusinessUsers` hook has been removed from the team tab (was only used by the now-removed create flow). No 403 is triggered for MANAGER.
- `ProviderEditSheet` saves `displayName`/`serviceIds` first, then `isActive` in a second sequential call to avoid a race where the status validation (which checks service links in the DB) fires before the new `serviceIds` are committed.

Customers tab specifics:

- Tapping a customer row always opens a read-only `CustomerDetailSheet` for all roles (OWNER, MANAGER, MEMBER).
- `CustomerDetailSheet` shows: name, status badge, phone, email, notes, and customer appointment history.
- OWNER/MANAGER see an "עריכת לקוח" button fixed at the bottom of the detail sheet. Tapping it opens `CustomerEditSheet` on top.
- `CustomerEditSheet` contains only editable fields and the fixed save button. No history is shown there.
- MEMBER sees details and history only — no edit action is mounted.

Customer appointment history:

- `CustomerAppointmentHistory` component fetches past appointments for the selected customer using the backend `businessCustomerId` filter.
- Lookback: 18 months. Cap: 10 rows. Sort: newest first (client-side reverse of backend ASC).
- Each row shows: service name, status badge, date/time, provider name.
- Hebrew empty/loading/error states included.
- Calendar is not changed and remains future-only.

ServiceProvider assignment policy (locked — do not change without explicit instruction):

Removing a `serviceId` from a `ServiceProvider` does **not** block or cancel existing future appointments for that `(serviceProviderId, serviceId)` pair. Existing appointments remain valid and manageable. The change applies only to new bookings. Do not add blocking confirmation or cascade cancellation without an explicit product decision.

Next focus areas: public booking flow, notifications UI, billing UI.

## Workflow

Before editing:

1. Inspect relevant files.
2. If the task is clear and well-scoped, implement it.
3. If route names, DTOs, permissions, or domain behavior are ambiguous, stop and ask before changing behavior.

After editing:

1. Summarize changed files.
2. Explain risks.
3. Run relevant build/test commands.
4. Show what passed or failed.

Do not refactor unrelated files. Do not change permission behavior while adding tests unless explicitly requested.

## Commands

Prefer monorepo-filtered commands from the repo root:

- `pnpm --filter api test`
- `pnpm --filter api test:e2e`
- `pnpm --filter api lint`
- `pnpm --filter api build`
- `pnpm --filter api prisma validate`
- `pnpm --filter api prisma generate`

Docker:

- `docker compose up -d`
- `docker ps`

From `apps/api` directly (when inside that directory):

- `pnpm start:dev`
- `pnpm prisma migrate dev`

## Do Not Commit

- `node_modules/`
- `.env`
- `dist/`
- `.turbo/`
- `apps/api/src/generated/`
