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
  - `createAppointment` rejects a non-ACTIVE `BusinessCustomer` with `BadRequestException('Customer is not active')`.
  - E2E coverage added for customer-activity check on appointment creation.
  - **Superseded:** the original "active ServiceProvider cannot link inactive services" rule from this phase was replaced — see "Service ↔ ServiceProvider activation policy" below.
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
  - **Superseded for the OWNER path** — see "OWNER invitation via Clerk Application Invitations" below. `createOwnerForBusiness` no longer creates an immediately-`ACTIVE` `BusinessUser`; it now creates `INVITED` and only activates once a Clerk invitation is claimed. This step's historical description (`BusinessUser` created `ACTIVE` instead of `INVITED`) no longer reflects current code — kept here for history only.
  - Dashboard-invited users (created via `POST /dashboard/businesses/:businessId/users`) remain unaffected by this supersession — that path still creates `BusinessUser` as `ACTIVE` directly (see MANAGER/MEMBER TODO below).
  - E2E coverage: `admin-businesses.e2e-spec.ts` regression tests updated for the new `INVITED`-until-claimed behavior (see below).
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
  - Phase B.2 — Admin add business user:
    - `POST /admin/businesses/:businessId/users` added (platform admin only, no business status check).
    - Works on DRAFT businesses — critical for onboarding because SP creation requires a valid businessUserId.
    - Reuses `CreateBusinessUserDto` from dashboard (phone, optional email, role: MANAGER|MEMBER). OWNER role blocked by DTO enum validation.
    - Created `BusinessUser` is immediately `status: ACTIVE` — no invitation flow.
    - User upsert by normalized phone (find by phone → find by email → create). Existing user with new business → new BusinessUser row. Same user twice in same business → 409.
    - Returns `BusinessUserCreatedDto` shape (id, userId, businessId, role, status, phoneNormalized, email, serviceProviderId).
    - `addBusinessUser(businessId, dto)` added to `AdminBusinessesService`.
    - No Prisma schema changes. Dashboard business-user creation behavior unchanged.
    - E2E: `admin-businesses.e2e-spec.ts` +13 tests (86 total); covers DRAFT creation, MEMBER/MANAGER, OWNER blocked, DTO validation, 404/403/401, duplicate 409, cross-business, dashboard DRAFT lock (403), dashboard after TRIAL (200), B.1+B.2+SP integration test.
  - Phase B.3 — Admin set business working hours:
    - `PUT /admin/businesses/:businessId/working-hours` added (platform admin only, no business status check).
    - Works on DRAFT businesses — required for `hasBusinessWorkingHours` readiness check before DRAFT→TRIAL.
    - Reuses `UpsertWorkingHoursDto` (same DTO as dashboard). Full-week replacement semantics (delete-then-recreate in one transaction), identical to dashboard.
    - Validation: duplicate dayOfWeek → 400; open day missing startTime/endTime → 400; endTime ≤ startTime → 400. Time format validated by `WorkingHourItemDto` (@Matches HH:mm).
    - Does not call `bookingValidation.checkBusinessHoursConflict` (admin endpoint is for DRAFT onboarding; no appointments exist in DRAFT phase).
    - Returns `WorkingHourDto[]` sorted by dayOfWeek.
    - `setBusinessWorkingHours(businessId, dto)` added to `AdminBusinessesService`.
    - No Prisma schema changes. Dashboard working-hours behavior unchanged.
    - E2E: `admin-businesses.e2e-spec.ts` +13 tests (99 total); covers DRAFT set, mixed open/closed, full replacement, 404/400/403/401, dashboard visibility after TRIAL, readiness contribution, tenant isolation.
  - Phase B.4 — Admin set ServiceProvider working hours:
    - `PUT /admin/businesses/:businessId/service-providers/:serviceProviderId/working-hours` added (platform admin only, no business status check).
    - Works on DRAFT businesses — required for `allActiveProvidersHaveWorkingHours` readiness check before DRAFT→TRIAL.
    - Verifies SP exists and belongs to `businessId` → 404 if not found or cross-tenant.
    - Reuses `UpsertWorkingHoursDto`. Full-week replacement semantics, identical to dashboard.
    - Same inline validation as B.3 (duplicate days, open-day time range, HH:mm format via DTO).
    - Does not call `bookingValidation.checkServiceProviderHoursConflict` (DRAFT onboarding; no appointments exist).
    - Returns `WorkingHourDto[]` sorted by dayOfWeek.
    - `setServiceProviderWorkingHours(businessId, serviceProviderId, dto)` added to `AdminBusinessesService`.
    - No Prisma schema changes. Dashboard SP working-hours behavior unchanged.
    - E2E: `admin-businesses.e2e-spec.ts` +15 tests (114 total); covers DRAFT set, mixed days, full replacement, 404 (biz/SP/cross-tenant), 400 (day/time), 403/401, dashboard visibility after TRIAL, readiness contribution, tenant isolation.
  - Phase B.5 — Admin onboarding summary:
    - `GET /admin/businesses/:businessId/onboarding-summary` added (platform admin only, no business status check).
    - Works on any business status including DRAFT — read-only, no mutations.
    - Single compound Prisma query + `computeBusinessReadiness` call. Returns `AdminOnboardingSummaryDto` with business metadata, users (with user phone/email), services, serviceProviders (with `serviceIds[]` and `hasWorkingHours`), businessWorkingHours, and embedded `readiness` block.
    - Does NOT replace or expand `GET /admin/businesses/:businessId/readiness` — that endpoint stays lean and is called by `setBusinessStatus` and `setPublicBookingEnabled`.
    - `getOnboardingSummary(businessId)` added to `AdminBusinessesService`. `AdminOnboardingSummaryDto` interface defined in same file.
    - No Prisma schema changes. Dashboard behavior unchanged.
    - E2E: `admin-businesses.e2e-spec.ts` +13 tests (127 total); covers full DRAFT business (all keys, metadata, users, services, SPs with serviceIds+hasWorkingHours, businessWorkingHours ordering, readiness embed), empty DRAFT business, DRAFT status not blocked, 404/403/401, tenant isolation.
- Full onboarding happy-path E2E test:
  - Consolidated test added to `admin-businesses.e2e-spec.ts`: `describe('Full two-partner onboarding happy path (DRAFT → ACTIVE)')`.
  - One `it` block proves the complete 15-step Admin/Ops sequence: create business → create OWNER → add MANAGER → create 2 services → create 2 ServiceProviders with different service assignments → set business + both provider working hours → verify onboarding summary → verify all 7 readiness checks → DRAFT → TRIAL → ACTIVE.
  - Asserts publicBookingEnabled remains false throughout and is never accidentally set.
  - Serves as a living backend runbook for first manual onboarding.
  - E2E: `admin-businesses.e2e-spec.ts` +1 test (128 total).
- Phase C — Admin correction endpoints (DRAFT-safe):
  - Goal: fix common setup mistakes during DRAFT onboarding without DB edits or moving to TRIAL early.
  - `PATCH /admin/businesses/:businessId` — update name, timezone, locale, currency. Reuses `UpdateBusinessSettingsDto`. At least one field required → 400 otherwise. slug is intentionally immutable (not in DTO; sending it returns 400 due to `forbidNonWhitelisted`). Works on any business status.
  - `PATCH /admin/businesses/:businessId/services/:serviceId` — update service fields. Reuses `UpdateServiceDto`. Verifies service belongs to businessId → 404 if cross-tenant. No cascade on deactivation (readiness reflects the broken state). Works on any business status.
  - `PATCH /admin/businesses/:businessId/service-providers/:serviceProviderId` — update SP displayName, serviceIds, isActive. Reuses `UpdateServiceProviderDto`. Preserves all invariants from `createServiceProvider`: active SP cannot link inactive services; activating SP with no services → 400. businessUserId remains immutable. Transaction: delete+recreate service links when serviceIds provided. Works on any business status.
  - All three: `ClerkAuthGuard + PlatformAdminGuard` only. No dashboard guards. No Prisma schema changes. Dashboard behavior unchanged.
  - E2E: `admin-businesses.e2e-spec.ts` +33 tests (161 total); `describe('Phase C — Admin correction endpoints')` with 3 nested describes (9 + 11 + 13 tests). Shared `beforeAll`/`afterAll`/`beforeEach` resets mutable state. Covers DRAFT allowed, partial update, invariant validation, cross-tenant 404, 403, 401, readiness-restore integration test.
- Phase D — Automatic Clerk user provisioning (email-first):
  - `ClerkProvisioningService` added in `src/auth/clerk-provisioning.service.ts`. Exported from `AuthModule`. Injected into `BusinessUsersService` and `AdminBusinessesService`.
  - `findOrCreateClerkUser({ email: string })` — searches Clerk by email, creates if not found. No phone-based Clerk calls. Throws `BadGatewayException` (502) on Clerk API failure.
  - Authentication is **email-only** for business users (OWNER/MANAGER/MEMBER). Clerk phone/SMS auth is not used (Israeli phone numbers not supported by Clerk in current setup).
  - `POST /admin/businesses/:businessId/owner` (`CreateBusinessOwnerDto`): `email` is now **required** (DTO-level validation). **Superseded** — this endpoint no longer provisions Clerk eagerly via `ClerkProvisioningService`; see "OWNER invitation via Clerk Application Invitations" below for current behavior.
  - `POST /admin/businesses/:businessId/users` (`CreateBusinessUserDto`, shared with dashboard): `email` required at service level (`addBusinessUser` throws 400 if missing). Email is NOT enforced by DTO (DTO is shared with dashboard which still has optional email). Provisions Clerk before the Prisma transaction.
  - Pre-provision check: if internal `User` already has `clerkUserId`, Clerk is skipped (idempotent on retry). Lookup by phone first, email as fallback.
  - Module wiring: `AuthModule` imports/exports `ClerkProvisioningService`; `BusinessUsersModule` imports `AuthModule`; `AdminModule` imports `AuthModule`.
  - E2E mock: `overrideProvider(ClerkProvisioningService)` with `mockClerkProvisioning`. Default implementation returns deterministic clerkUserId from email. Reset via `beforeEach` in Phase D describe block.
  - E2E: `admin-businesses.e2e-spec.ts` +9 tests (170 total); includes missing-email-400, Clerk-failure-502, skip-if-prelinked, phone-normalization, 403/401.
  - Unit: `clerk-provisioning.service.spec.ts` 8 tests — email search, email create (verifies no phoneNumber in Clerk payload), error handling.
  - No Prisma schema changes. No frontend changes. Dashboard behavior unchanged.
- Phase D.2 — Harden ClerkAuthGuard for email-only business users:
  - `ClerkAuthGuard` slow path no longer requires a Clerk phone. Business users authenticate by email only; Clerk phone/SMS is not used.
  - Slow path order: (1) fast path by `clerkUserId` (unchanged); (2) try link by phone (legacy — only if Clerk phone available); (3) try link by email (primary for Phase D users); (4) if phone available and no match → create user (legacy); (5) email-only + no match → 401.
  - `phoneNormalized` is NOT included in the email-path update: email-only Clerk users have no Clerk phone, and the internal `User.phoneNormalized` (set at provisioning time) is preserved as-is.
  - Auto-create is only possible when Clerk provides a phone number (legacy path). Email-only users must be provisioned by admin before first login (closed system).
  - Business users still **must have a phone internally** (`User.phoneNormalized` required by schema). Phone is contact metadata; it is not used for Clerk auth and is never sent to Clerk.
  - Customers (future `BusinessCustomer` / public booking) are phone-first and do NOT authenticate through Clerk. Customer models and customer auth are NOT part of Phase D/D.2.
  - Unit: `clerk-auth.guard.spec.ts` +4 D.2 tests (20 total): email-only link success, email lowercase normalization, email-only + no match → 401, email already linked to different Clerk account → 401.
  - `business-users.service.spec.ts` updated: adds `ClerkProvisioningService` mock, `user.update` mock, and correct assertions after Phase D changed `createOwnerForBusiness` to provision Clerk and use `status: ACTIVE`. 7 tests total (net +2 vs pre-D baseline).
  - `admin-businesses.service.spec.ts` updated: adds `ClerkProvisioningService` stub provider. 5 tests unchanged.
  - No Prisma schema changes. No E2E changes. No frontend changes.
- OWNER invitation via Clerk Application Invitations (supersedes Step 2 and the OWNER half of Phase D — MANAGER/MEMBER admin creation via `POST /admin/businesses/:businessId/users` is unaffected and still described accurately by Phase D above):
  - **Model**: `BusinessInvitation` (`apps/api/prisma/schema.prisma`) is the internal source of truth for invitation lifecycle. Fields: `id` (also embedded in Clerk's invitation `publicMetadata.businessInvitationId`), `businessId`, `businessUserId` (1:1, `@unique`), `email`, `status` (`PENDING | ACCEPTED | REVOKED | EXPIRED` — `REVOKED`/`EXPIRED` exist in the enum but nothing currently writes them), `clerkInvitationId` (nullable, `@unique`), `clerkSendAttemptedAt` (nullable), `expiresAt` (nullable), `invitedByUserId`, `acceptedAt`.
  - **Ordering guarantee (hardening patch)**: `BusinessUsersService.createOwnerForBusiness` persists `User` (`INVITED`), `BusinessUser` (`OWNER`, `INVITED`), and `BusinessInvitation` (`PENDING`, `clerkInvitationId: null`, `expiresAt: null`) in one Serializable-isolation transaction and commits it **before** calling Clerk. Only after commit does it call `ClerkInvitationsService.createOwnerInvitation` (`apps/api/src/auth/clerk-invitations.service.ts`, wraps `clerk.invitations.createInvitation` with `ignoreExisting: true`, `notify: true`, `expiresInDays: 7`). `clerkSendAttemptedAt` is written immediately before the Clerk call (not after), so a failure between that write and the confirmation write leaves a distinguishable "attempted, unconfirmed" state rather than looking identical to "never attempted". `clerkInvitationId`/`expiresAt` are only persisted after Clerk confirms. **Invariant**: a Clerk invitation email can never carry a `businessInvitationId` that doesn't already exist in Postgres.
  - **Residual gap, documented not hidden**: if the Clerk call succeeds but the confirmation write fails (process crash, DB blip), we cannot distinguish "Clerk never got the request" from "Clerk sent it and we failed to record the id" without querying Clerk's invitation list and reconciling by email, which is not implemented. A retry in that window is safe from an orphan-record perspective but may, depending on Clerk's exact `ignoreExisting` semantics (not independently verified against a live Clerk instance), produce a second Clerk-side invitation object for the same email.
  - **Concurrency**: the persist transaction uses `Prisma.TransactionIsolationLevel.Serializable`. A genuine Postgres write conflict (`P2034`) or transaction-API failure (`P2028`) is translated to `ConflictException('Business already has an owner')` rather than a raw 500. Verified against a real concurrent-transaction reproduction during hardening.
  - **Already-linked Clerk users fail closed**: if the target phone/email already resolves to an internal `User` with `clerkUserId` set, `createOwnerForBusiness` throws `ConflictException` before ever calling Clerk. Reason: `ClerkAuthGuard`'s fast path (resolve by `clerkUserId` alone) returns before ever consulting invitation `publicMetadata` again, so an invitation sent to an already-linked identity could never be claimed through normal login. **Multi-business / second-invitation claiming for an already-linked user is an explicit, documented blocker — see TODO below — not silently bypassed.**
  - **Claim mechanism**: `ClerkAuthGuard.claimBusinessInvitation` (`apps/api/src/auth/guards/clerk-auth.guard.ts`) runs only inside `resolveUser`'s slow path (i.e., only the *first* time a given `clerkUserId` is resolved — once `User.clerkUserId` is set, the fast path short-circuits and never re-examines `publicMetadata` again). Reads `publicMetadata.businessInvitationId` (Clerk copies a Clerk invitation's `publicMetadata` onto the user it creates when the invitee accepts). Validates: invitation exists, `status === PENDING`, `clerkInvitationId` and `expiresAt` are both non-null (an unconfirmed row can't have a legitimate Clerk ticket), not expired, resolved email matches exactly. On success: invitation → `ACCEPTED`, `BusinessUser` → `ACTIVE`, `User.clerkUserId` linked. Any failure → 401, with **no fallback** to the legacy phone/email matching path (an invalid `businessInvitationId` is itself a signal something is wrong).
  - **Webhooks are not load-bearing** for any of this — the claim happens synchronously on the invitee's first authenticated request, not via `apps/api/src/webhooks/clerk-webhook.service.ts` (which still exists, unchanged, for basic `User` email/phone sync only).
  - **Frontend**: `AppAccessGate` (`apps/web/src/app/app/_components/app-access-gate.tsx`) is a shared gate mounted once in `apps/web/src/app/app/layout.tsx`, covering every route under `/app/*` including deep links. Decision logic is a pure function, `resolveAppAccessState` (`app-access-gate.logic.ts`, unit-tested without a component-rendering framework since none is installed). States: no membership → "no-access"; `BusinessUser.status === INVITED` → "invited"; any other non-`ACTIVE` `BusinessUser` status → "inactive"; `Business.status === DRAFT` → "draft" (copy: "הגישה שלך אושרה, והעסק עדיין בהקמה."); `SUSPENDED`/`CANCELLED` → their own states; `TRIAL`/`ACTIVE` business + `ACTIVE` membership → normal render. When the gate doesn't render `children`, the actual page shell (data hooks, bottom nav, FAB) never mounts at all — this is a UX/consistency layer only, not an authorization boundary; backend guards remain authoritative. Admin onboarding UI (`admin-onboarding-shell.tsx`) updated to show an "invitation sent" (amber) state for an `INVITED` owner instead of the previous "not yet created" copy, which would otherwise have been misleading after every successful invite.
  - Admin new-business-form copy (`admin-new-business-shell.tsx`) updated from "created the owner" language to "invitation sent" language throughout.
  - No data migration was required or performed. Existing `ACTIVE` `BusinessUser`/`User` rows created by the old eager-provisioning flow (with `clerkUserId` already set) are entirely unaffected — `ClerkAuthGuard`'s fast path resolves them exactly as before, and `claimBusinessInvitation` is never reached for them.
  - Unit: `clerk-invitations.service.spec.ts` (4 tests), `business-users.service.spec.ts` rewritten (17 tests — persist-first ordering, Serializable/P2034/P2028 conflict translation, already-linked fail-closed, retry-reuses-id, expired-retry), `clerk-auth.guard.spec.ts` +1 (unconfirmed-invitation rejection; 28 total, all pre-existing fast-path/legacy tests unchanged), `app-access-gate.logic.test.ts` (10 tests, new — first React-free frontend unit test alongside `timeline-range.test.ts`).
  - E2E: `admin-businesses.e2e-spec.ts` updated throughout for `INVITED`-not-`ACTIVE` owner-creation assertions, plus new coverage: Clerk-failure-leaves-retryable-state-then-retry-succeeds, already-linked-user-409, concurrent-owner-invite-race (real `Promise.all` against the test DB, asserts exactly one 201 + one 409 and exactly one OWNER row survives). All cleanup blocks touching businesses that go through owner creation now delete `BusinessInvitation` rows before `BusinessUser` rows (FK `BusinessInvitation.businessUserId → BusinessUser.id` is `RESTRICT`).
  - No Clerk Dashboard changes, environment variable changes, or webhook configuration changes were made as part of this work. Restricted Sign-up Mode is **not** enabled by any of this — it remains a manual Clerk Dashboard step.
- **High-priority TODOs** (do not treat any of the following as implemented or safe until explicitly completed and verified):
  - **MANAGER/MEMBER migration to `BusinessInvitation`.** Scope: `AdminBusinessesService.addBusinessUser` (`POST /admin/businesses/:businessId/users`) and `DashboardDataService.createBusinessUser` (`POST /dashboard/businesses/:businessId/users`) still use eager `ClerkProvisioningService.findOrCreateClerkUser` + immediate `BusinessUser.status = ACTIVE`, unrelated to the invitation model. Reason deferred: explicitly out of scope for this hardening patch by product decision. Risk: low today (existing, tested behavior), but perpetuates the "no real invitation, no email, immediate ACTIVE" pattern for MANAGER/MEMBER. Completion condition: both endpoints moved onto `BusinessInvitation` + `ClerkInvitationsService`, with role-aware invitation creation and matching claim behavior, plus the case-sensitivity email-normalization fix already applied to `CreateBusinessUserDto` carried forward.
  - **Multi-business / multiple-pending-invitation claim support.** Scope: `ClerkAuthGuard.resolveUser` fast path (`apps/api/src/auth/guards/clerk-auth.guard.ts`). Reason deferred: `claimBusinessInvitation` only ever runs on a Clerk identity's first resolution; once `clerkUserId` is linked, no later invitation (to a second business, or a second pending invitation for the same first login) can ever be claimed through normal login. Currently mitigated by failing closed at invite-creation time (`ConflictException`) rather than sending an unclaimable email. Risk: P1 — not a security gap (no unauthorized access), but a real functional gap that will block any future multi-business OWNER/MANAGER/MEMBER flow. Completion condition: a designed claim path for already-linked identities (e.g., re-checking metadata on a distinct signal, not merely removing the fast-path short-circuit for every request) is implemented, tested, and this fail-closed check is removed only once that path exists.
  - **Clerk webhook signing-secret verification.** Scope: `apps/api/.env` `CLERK_WEBHOOK_SECRET`. Reason deferred: observed during a prior audit to resemble a URL rather than a svix signing secret; not fixed or verified in this patch (env changes explicitly out of scope). Risk: P1 operational — if genuinely misconfigured, `ClerkWebhookService.verifyWebhook` fails closed (401) on every delivery, which is safe but means the webhook is silently non-functional. Completion condition: confirm/correct the value in Clerk Dashboard + `.env`, then verify a real webhook delivery succeeds end-to-end.
  - **Webhook signature/replay E2E coverage.** Scope: `clerk-webhook.controller.ts`/`clerk-webhook.service.ts`. Reason deferred: webhooks are explicitly not load-bearing for the invitation flow; existing unit tests mock `verifyWebhook` directly rather than exercising real svix signature verification end-to-end. Risk: P2 (webhooks aren't relied on for anything security-critical today). Completion condition: an e2e test posting a real svix-signed payload (and a tampered/replayed one) through the actual controller.
  - **Invitation resend/revoke/expiry/audit UX.** Scope: Admin onboarding UI + `AdminBusinessesService`. Reason deferred: not in scope for this patch. Today, an expired or failed invitation is only fixable by re-submitting the same "create owner" form (which safely reuses the same `BusinessInvitation` row), with no explicit "resend" action, no way to revoke a Clerk invitation (`clerk.invitations.revokeInvitation` is never called — a retry-after-expiry can leave an orphaned, harmless Clerk-side invitation object), and no audit trail beyond `invitedByUserId`/timestamps on the row itself. Risk: P2, UX/ops gap. Completion condition: explicit resend/revoke endpoints + admin UI actions, with revoke wired to `clerk.invitations.revokeInvitation`.
  - **Real Clerk development-instance acceptance testing.** Scope: the full flow, live. Reason deferred: this patch is code + automated tests only; no real Clerk invitation email has been sent/clicked end-to-end (by design — see manual test checklist delivered with this patch). Risk: P0 for launch readiness specifically — `ignoreExisting: true`'s exact behavior against an email that already has a real Clerk user account has never been verified live, and neither has the invitation-ticket → `/sign-up` → claim path. Completion condition: the manual Clerk dev-instance checklist (delivered alongside this patch) is run to completion at least once before Restricted Sign-up Mode is enabled anywhere.
  - **Restricted Sign-up Mode enablement.** Scope: Clerk Dashboard configuration, not code. Reason deferred: explicitly excluded from this patch by instruction. Risk: P1 — until enabled, `/sign-up` remains technically open to uninvited signups (though the backend already rejects them with 401 on every API call, so no data exposure results). Completion condition: enabled in Clerk Dashboard only after the "real Clerk development-instance acceptance testing" TODO above has passed.
  - **Frontend route/access-state E2E coverage.** Scope: `/app/*` routes. Reason deferred: no component-rendering or E2E frontend test framework (Playwright, React Testing Library) is installed in this project; adding one was explicitly out of scope for this patch. `AppAccessGate`'s decision logic is unit-tested via `resolveAppAccessState`, but the actual rendered component/route behavior (deep-linking into `/app/calendar` while DRAFT, etc.) has only been verified by direct code inspection (the gate wraps `{children}` in the shared layout, so it structurally applies to every route), not by an automated browser-level test. Risk: P2. Completion condition: a frontend E2E framework is introduced (separate decision) and route-level tests are added per the test plan in the hardening audit.
- Approximate test counts: 24+ E2E suites / 611+ tests, 19+ unit suites / 332+ unit tests.
- Admin/Ops onboarding runbook: `docs/admin-onboarding-runbook.md` — step-by-step guide for manually onboarding a business from DRAFT to ACTIVE using backend endpoints only. Covers the full two-partner setup, working hours, readiness verification, status transitions, common mistakes, and troubleshooting. Phase C, Phase D, and the OWNER invitation flow documented. Email is required for OWNER and MANAGER creation.
- Next backend focus areas: notifications/outbox, audit logs, billing — see `docs/backend-roadmap.md`.

## Frontend Route Architecture

Four product surfaces — each with a distinct route namespace:

| Surface | Route | Status |
| --- | --- | --- |
| Marketing site | `/` | Placeholder — redirects to `/app/home` until a real marketing page is built |
| Public Booking | `/book/[businessSlug]` | Planned — where customers choose service/provider/time and book |
| Business App | `/app/*` | Live |
| Internal Admin | `/admin/*` | Shell live (Phase E.0) — placeholder pages only, no forms yet |

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

Access-state gating: `AppAccessGate` (`apps/web/src/app/app/_components/app-access-gate.tsx`), mounted once in `apps/web/src/app/app/layout.tsx`, wraps every route above uniformly — no per-page/per-shell duplication. Before rendering the normal dashboard shell, it checks `BusinessUser.status` and `Business.status` (from the already-fetched `BusinessProvider` context) and shows a dedicated state instead for: no membership, `INVITED` membership, non-`ACTIVE` membership, `DRAFT`/`SUSPENDED`/`CANCELLED` business. Only `TRIAL`/`ACTIVE` business + `ACTIVE` membership renders the real shell, data hooks, bottom nav, and FAB. This is a UX layer only — backend guards remain the actual authorization boundary.

Role behavior across all tabs:

- **OWNER**: full create/edit on customers, services, team; create + manage appointments on calendar and home.
- **MANAGER**: same as OWNER on customers, services, calendar; can edit existing `ServiceProvider`s on team but has no create FAB.
- **MEMBER**: read-only on all tabs — no create or edit sheets are mounted.

Team tab specifics:

- ServiceProvider creation is admin/ops-only. No FAB or create sheet exists in the business app. The team tab is read/edit-only for all roles.
- OWNER and MANAGER see `ProviderEditSheet` when tapping a provider row. MEMBER sees read-only `ProviderDetailSheet`.
- `GET /dashboard/businesses/:businessId/users` is OWNER-only. The `useAppBusinessUsers` hook has been removed from the team tab (was only used by the now-removed create flow). No 403 is triggered for MANAGER.
- `ProviderEditSheet` saves `displayName`/`serviceIds`/`isActive` together in a single `PATCH` call (not sequential — this doc previously said otherwise).
- `ProviderEditSheet` service chips show all active services plus all inactive services (not just already-assigned ones), since an inactive service may be assigned to an active provider as configuration.

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

Service ↔ ServiceProvider activation policy (locked — do not change without explicit instruction):

- A newly created `Service` always defaults to `isActive: false`, regardless of payload (`createService` ignores/rejects `isActive: true` since no provider can be assigned yet). This applies to both the dashboard and admin create-service paths.
- A `Service` may only transition to `isActive: true` (via `updateService` or `setServiceStatus`, dashboard or admin) when it already has at least one `isActive: true` `ServiceProvider` assigned. Enforced by `assertServiceHasActiveProviderAssignment` in `apps/api/src/dashboard/service-provider-activation.utils.ts`.
- Service-provider assignment is configuration, independent of either side's activation state: an inactive `Service` may be linked to an active `ServiceProvider`, and an active `ServiceProvider` may be linked to inactive `Service`s. The old "active ServiceProvider cannot link inactive services" rule was removed — keeping it would have created a circular dependency with the service-side rule above (a new service can never have an active provider assigned before it activates, since assignment can't happen during creation).
- A `ServiceProvider` activating (create or update) still requires at least one linked service (any status) — that invariant is unchanged.
- Removing the last active-provider link from an active `Service` (`updateServiceProvider` dropping a `serviceId`), or deactivating a `ServiceProvider` that is the only active provider of an active `Service`, is rejected with 400. The user must assign another active provider first or deactivate the service first — no silent/automatic deactivation. Enforced by `assertNoActiveServiceLosesLastActiveProvider`, same util file, called from both `updateServiceProvider` and `setServiceProviderStatus` (dashboard) and `updateServiceProvider` (admin).
- All of the above checks run inside the same Prisma `$transaction` as the corresponding write.
- Provider working hours are NOT required for service activation — that stays a separate readiness/availability concern.
- Existing appointments are never touched by any of the above (service deactivation, provider deactivation, or assignment removal) — confirmed by `Appointment`'s FK relations to `Service`/`ServiceProvider` having no cascade (default `Restrict`).
- Admin onboarding's `ProvidersSection` (`admin-onboarding-providers-section.tsx`) gates provider creation on "at least one service exists" (any status), not "at least one active service" — using the active-only gate would deadlock onboarding under this policy.

Next focus areas: public booking flow, notifications UI, billing UI.

## Current Admin Frontend Status (Phase E.0)

Admin UI shell is live at `/admin/*`. Placeholder only — no onboarding forms yet. Backend remains the single source of truth for authorization.

Live admin routes:

- `/admin` — redirects to `/admin/businesses` via `next.config.ts`
- `/admin/businesses` — placeholder business list page
- `/admin/businesses/[businessId]/onboarding` — placeholder onboarding page with section cards
- `/admin/settings` — placeholder system settings page

Admin shell components (`apps/web/src/app/admin/_components/`):

- `AdminAccessGate` — client component; calls `GET /admin/businesses` on mount; shows loading → forbidden (403) → children. Non-admin authenticated users see a lock screen.
- `AdminHeader` — server component; title + subtitle + Building2 icon badge.
- `AdminBottomNav` — client component; two tabs: עסקים (`/admin/businesses`) and מערכת (`/admin/settings`). Same pill-active pattern as `CalendarBottomNav`.

Admin layout (`apps/web/src/app/admin/layout.tsx`):

- Does NOT call `auth()` or make server-side API calls (avoids Next.js RSC conditional-children build issue).
- Wraps children in `QueryProvider` + desktop centering wrapper + `AdminAccessGate`.
- `export const dynamic = 'force-dynamic'` prevents static pre-rendering.
- Unauthenticated users are redirected by Clerk middleware before reaching the layout.

Admin API helper (`apps/web/src/lib/admin-api.ts`):

- `fetchAdminBusinesses(getToken)` — used by `AdminAccessGate` for access verification.
- `AdminBusinessListItemDto` interface defined here (no shared contract type yet).

## Current Admin Frontend Status (Phase E.2)

Phases E.1 + E.2 complete. Admin can create a new business and its primary owner from the UI.

Live admin routes:

- `/admin/businesses` — real business list from `GET /admin/businesses`; cards with name, slug, status badge, timezone, publicBookingEnabled, createdAt
- `/admin/businesses/new` — **guided create form** (Phase E.2): two-section form (פרטי העסק + בעלים ראשי), two-step submission (POST /admin/businesses → POST /admin/businesses/:id/owner), handles partial failure, navigates to onboarding page on full success
- `/admin/businesses/[businessId]/onboarding` — fetches `GET /admin/businesses/:id/onboarding-summary`; renders 6 step cards (פרטי עסק, בעלים וצוות, שירותים, יומנים, שעות פעילות, מוכנות לשימוש) with done/missing state; shows localized blocking reasons; shows disabled "פתח גישה לדשבורד" CTA (wired in E.4)

Admin hooks (`apps/web/src/app/admin/_hooks/`):

- `use-admin-businesses.ts` — wraps `fetchAdminBusinesses`; key `['admin', 'businesses']` shared with `AdminAccessGate`
- `use-admin-onboarding-summary.ts` — wraps `fetchAdminOnboardingSummary`; key `['admin', 'onboarding-summary', businessId]`; `staleTime: 30s`; exports `onboardingSummaryKey(businessId)` helper for targeted invalidation from section components
- `use-create-business-form.ts` — form state + two-step submission logic; handles partial failure (business ok / owner failed); invalidates `['admin', 'businesses']` on success; navigates to onboarding

Admin components (`apps/web/src/app/admin/_components/`):

- `AdminAccessGate` — query key `['admin', 'businesses']` (cache shared with list hook)
- `AdminBusinessesShell` — real list + empty/error/loading states + "הקמת עסק חדש" link to `/new`
- `AdminOnboardingShell` — coordinator: fetches summary, renders compact status overview + all setup sections
- `AdminNewBusinessShell` — two-section guided create form; `FormField`, `SectionLabel`, `ErrorBanner`, `PartialBanner` sub-components

API helpers (`apps/web/src/lib/admin-api.ts`):

- `fetchAdminBusinesses` / `fetchAdminOnboardingSummary` — read queries
- `createAdminBusiness(payload, getToken)` — POST /admin/businesses; returns `AdminCreatedBusinessDto`
- `createAdminBusinessOwner(businessId, payload, getToken)` — POST /admin/businesses/:id/owner; returns `AdminCreatedOwnerDto`

Create business form behavior:

- Section 1 fields: name (required), slug (required, lowercase URL-safe, forced-lowercase on input), timezone (required, default `Asia/Jerusalem`)
- Section 2 fields: email (required, valid email format), phone (required, any non-empty string — backend normalizes)
- Owner helper copy: "האימייל ישמש להתחברות דרך Clerk" / "הטלפון נשמר כפרטי קשר פנימיים ואינו משמש לאימות ב־Clerk"
- Submit states: idle → submitting (inputs disabled) → success (redirect) / error (banner) / partial (amber banner + link to onboarding)
- Partial failure (business created, owner failed): shows businessId + "המשך להקמה" link; does NOT retry business creation
- 409 slug conflict: localized error message shown inline

UX direction (locked by product decision):

- Admin UI is a **guided onboarding flow**, not a CRUD panel
- Language avoids "public booking" — uses "פתיחת גישה לדשבורד", "העסק מוכן לשימוש פנימי"
- `publicBookingEnabled` must remain `false`; never referenced in admin onboarding UI
- New businesses are always created as DRAFT; DRAFT blocks dashboard access
- "פתח גישה לדשבורד" = DRAFT → TRIAL; implemented in E.4

## Current Admin Frontend Status (Phase E.3)

Phase E.3 complete. Onboarding page now has interactive setup sections for managers, services, and ServiceProviders.

Live admin routes:

- `/admin/businesses/[businessId]/onboarding` — extended: compact status overview card at top + interactive setup sections (בעלים, מנהלים, שירותים, יומנים) + future steps placeholder + disabled dashboard CTA

Admin components (`apps/web/src/app/admin/_components/`):

- `AdminOnboardingShell` — refactored coordinator: at-a-glance `SummaryRow` compact view + `SectionDivider` layout + `OwnerSection` (read-only) + imports and renders the three section components
- `admin-onboarding-managers-section.tsx` (`ManagersSection`) — manager list + create-manager form (email+phone, role fixed to MANAGER); invalidates `onboardingSummaryKey` on success; 3s success flash; maps 409/502/400 errors to Hebrew
- `admin-onboarding-services-section.tsx` (`ServicesSection`) — service list (with inactive visual) + create-service form (name, durationMinutes 5-480, optional price in ₪ → priceCents cents); invalidates `onboardingSummaryKey` on success
- `admin-onboarding-providers-section.tsx` (`ProvidersSection`) — SP list (with linked user + hours status) + create-SP form (displayName, businessUserId dropdown, service checkboxes); prerequisite gate if no active services or all users taken; 409 mapped to Hebrew; invalidates `onboardingSummaryKey` on success

API helpers (`apps/web/src/lib/admin-api.ts`):

- `createAdminManager(businessId, payload, getToken)` — POST /admin/businesses/:id/users with `{ email, phone, role: 'MANAGER' }`; returns `AdminCreatedManagerDto`
- `createAdminService(businessId, payload, getToken)` — POST /admin/businesses/:id/services; returns `AdminCreatedServiceDto`
- `createAdminServiceProvider(businessId, payload, getToken)` — POST /admin/businesses/:id/service-providers with `{ displayName, businessUserId, serviceIds[] }`; returns `AdminCreatedServiceProviderDto`

Key domain facts locked in E.3:

- Each `BusinessUser` can only have one `ServiceProvider` (1:1, enforced by backend 409). The UI hides already-linked users from the SP creation dropdown.
- `businessUserId` is **required** for SP creation — must link to an existing OWNER or MANAGER.
- Services must exist (any status — active or inactive) before a SP can be created (prerequisite gate shown in UI). See "Service ↔ ServiceProvider activation policy" for why the gate is not active-only.
- Manager email is required at service level even though the DTO marks it optional (Clerk provisioning requires it).
- `ServiceProvider` and `BusinessUser` are separate concepts — manager creation never auto-creates a SP.
- Only the Admin creates ServiceProviders; no dashboard path exists.

Data consistency pattern:

- Every successful mutation calls `queryClient.invalidateQueries({ queryKey: onboardingSummaryKey(businessId) })`
- This triggers an automatic refetch of the onboarding summary, updating all sections reactively
- No page reload needed; TanStack Query handles the reactive chain

## Current Admin Frontend Status (Phase E.4)

Phase E.4 complete. Onboarding page now includes business working hours, per-provider working hours, and the DRAFT → TRIAL CTA.

Backend additions (concrete frontend blocker):

- `GET /admin/businesses/:businessId/working-hours` — read existing business working hours (admin only)
- `GET /admin/businesses/:businessId/service-providers/:serviceProviderId/working-hours` — read existing SP working hours (admin only)
- `getBusinessWorkingHours(businessId)` added to `AdminBusinessesService`
- `getServiceProviderWorkingHours(businessId, serviceProviderId)` added to `AdminBusinessesService`
- These are pure Prisma reads with business/SP existence checks; no new business logic

New frontend components (`apps/web/src/app/admin/_components/`):

- `admin-hours-editor.tsx` — shared internal module: `HourRow` type, `defaultHours()`, `initHoursFromData()`, `WeekHoursEditor` component. Used by both hours sections. Internal to admin surface — not coupled to Business App route components.
- `admin-onboarding-business-hours-section.tsx` (`BusinessHoursSection`) — inline week hours editor initialized from summary's `businessWorkingHours`. Saves via `PUT /admin/businesses/:id/working-hours`. Tracks `isDirty`; save button disabled until dirty. Initializes once from props on mount; not re-synced on summary refetch (avoids wiping in-progress edits).
- `admin-onboarding-provider-hours-section.tsx` (`ProviderHoursSection`) — accordion list of active SPs. Expanding a provider card loads its hours via `GET /admin/businesses/:id/service-providers/:spId/working-hours` (lazy, per-expand). Collapses others. Saves via `PUT .../working-hours`. Falls back to defaults on load error (editor still usable). Uses `getTokenRef` pattern to avoid stale closure.
- `admin-onboarding-lifecycle-section.tsx` (`LifecycleSection`) — DRAFT → TRIAL CTA. Shows compact preflight readiness summary (informational only; does not gate the CTA — backend has no readiness requirement for DRAFT → TRIAL). After success: invalidates summary, shows "הגישה לדשבורד פתוחה" state. Handles 409 (not-DRAFT) and generic errors with Hebrew copy. TRIAL/ACTIVE state shows explanation about next steps.

Updated components:

- `admin-onboarding-shell.tsx` — removed `FutureStepCard` and disabled CTA placeholder; replaced with `BusinessHoursSection`, `ProviderHoursSection`, `LifecycleSection`; summary card updated with `שעות עסק` and `שעות יומנים` rows (7 rows total)

API helpers (`apps/web/src/lib/admin-api.ts`) additions:

- `AdminWorkingHourItem`, `AdminWorkingHoursPayload`, `AdminWorkingHourDto` — working hours types
- `fetchAdminBusinessWorkingHours(businessId, getToken)` — GET
- `setAdminBusinessWorkingHours(businessId, payload, getToken)` — PUT
- `fetchAdminServiceProviderWorkingHours(businessId, spId, getToken)` — GET
- `setAdminServiceProviderWorkingHours(businessId, spId, payload, getToken)` — PUT
- `AdminSetStatusPayload`, `AdminBusinessStatusDto`, `setAdminBusinessStatus(businessId, status, getToken)` — PATCH /status

Key domain facts locked in E.4:

- DRAFT → TRIAL requires no readiness check on backend. The CTA is always available when status is DRAFT.
- TRIAL → ACTIVE is NOT implemented in E.4 (out of scope).
- Business hours and SP hours are separate concepts. SP hours are NOT auto-copied from business hours.
- The admin hours editor uses `type="time"` inputs. Format is HH:mm as required by backend.
- `businessWorkingHours` in the summary is used to initialize the business hours editor once (not re-synced on subsequent summary refetches to preserve in-progress edits).
- SP hours are fetched lazily (on accordion expand) via the new admin GET endpoint.

## Current Admin Frontend Status (Phase E.5)

Phase E.5 complete. Onboarding lifecycle section now covers all three business states with full readiness review and TRIAL → ACTIVE activation.

Updated frontend components (`apps/web/src/app/admin/_components/`):

- `admin-onboarding-lifecycle-section.tsx` (`LifecycleSection`) — rewritten to handle three distinct status states:
  - **DRAFT**: existing "פתח גישה לדשבורד" CTA unchanged (no readiness gate — backend has no requirement for DRAFT → TRIAL). Informational-only preflight checklist.
  - **TRIAL**: "הגישה לדשבורד פתוחה" badge + full 7-check readiness checklist sourced from `summary.readiness`. Each failing check shows Hebrew guidance pointing to the relevant onboarding section. "הפעל עסק" CTA shown only when `readiness.isReady === true`; otherwise replaced by "complete required sections" note. On 400/409 activation failure: invalidates `onboardingSummaryKey` to force readiness refetch.
  - **ACTIVE**: "העסק פעיל" green banner + compact all-green readiness summary. No CTAs.
- Local `activationStatus === 'success'` used as early ACTIVE indicator before summary refetch completes.

API helper (`apps/web/src/lib/admin-api.ts`) addition:

- `fetchAdminReadiness(businessId, getToken)` — GET `/admin/businesses/:id/readiness` returning `AdminReadinessDto`. Endpoint was already verified in backend; function added as the canonical wrapper. UI uses `summary.readiness` (embedded in the onboarding summary) to avoid an extra network round-trip; `fetchAdminReadiness` is available for direct queries if needed.

Key domain facts locked in E.5:

- TRIAL → ACTIVE requires `readiness.isReady === true` (enforced by backend; UI gates the CTA).
- The `AdminReadinessChecks` 7-check interface is the sole source of truth — no client-side readiness logic.
- After successful TRIAL → ACTIVE: `onboardingSummaryKey` is invalidated; the summary refetch returns `business.status === 'ACTIVE'` which switches the component to the ACTIVE view.
- On 400 activation failure (not ready): summary is invalidated so the checklist reflects any changes made since last load.
- `setAdminBusinessStatus(businessId, 'ACTIVE', getToken)` (already in `admin-api.ts`) is reused for activation — no new function needed.

Suggested next phase:

- **E.6** — Full QA pass: create business through Admin UI end-to-end, owner/manager login, Business App verified

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
