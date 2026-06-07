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
- Approximate test counts: 22+ E2E suites / 400+ tests, 17+ unit suites / 285+ unit tests.
- Next backend focus areas: notifications/outbox, audit logs, billing — see `docs/backend-roadmap.md`.

## Current Mobile Frontend Status

Mobile MVP CRUD is stable. All five `/mobile/` tabs are complete and role-gated.

Completed tabs: `/mobile/home`, `/mobile/calendar`, `/mobile/customers`, `/mobile/services`, `/mobile/team`.

Bottom nav is clean: all five tabs active, no "coming soon" overlays or state.

Role behavior across all tabs:

- **OWNER**: full create/edit on customers, services, team; create + manage appointments on calendar and home.
- **MANAGER**: same as OWNER on customers, services, calendar; can edit existing `ServiceProvider`s on team but has no create FAB.
- **MEMBER**: read-only on all tabs — no create or edit sheets are mounted.

Mobile team specifics:

- OWNER sees a FAB and can create a `ServiceProvider` linked to an eligible `BusinessUser`. Eligible = `status === 'ACTIVE'` AND `hasServiceProviderProfile === false`.
- `GET /dashboard/businesses/:businessId/users` is OWNER-only. For non-OWNER roles the fetch is skipped entirely (`Promise.resolve([])`). No 403 is triggered for MANAGER.
- `ProviderEditSheet` saves `displayName`/`serviceIds` first, then `isActive` in a second sequential call to avoid a race where the status validation (which checks service links in the DB) fires before the new `serviceIds` are committed.

ServiceProvider assignment policy (locked — do not change without explicit instruction):

Removing a `serviceId` from a `ServiceProvider` does **not** block or cancel existing future appointments for that `(serviceProviderId, serviceId)` pair. Existing appointments remain valid and manageable. The change applies only to new bookings. Do not add blocking confirmation or cascade cancellation without an explicit product decision.

Next mobile focus areas: public booking flow, notifications UI, billing UI.

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
