# Backend Roadmap

## Foundation - Completed

- Monorepo with pnpm and Turborepo.
- NestJS API under `apps/api`.
- PostgreSQL via Docker Compose.
- Prisma 7 configured.
- Prisma schema initialized.
- Prisma Client generation integrated into build.
- NestJS ConfigModule configured.
- PrismaModule and PrismaService added.
- Health endpoint checks real database connectivity.

## Phase 1 - Platform Admin and Businesses

Goal: allow platform admin to create tenants.

Tasks:

- Create AdminModule.
- Create BusinessesModule.
- Create DTOs for business creation.
- Add validation with class-validator.
- Add `POST /admin/businesses`.
- Add `GET /admin/businesses`.
- Add platform admin seed.
- Add basic tests for business creation.

## Phase 2 - Business Owner Onboarding

Goal: business owners cannot self-register; they are invited.

Tasks:

- Add Invitation model.
- Create owner invitation flow.
- Hash invitation tokens.
- Accept invitation endpoint.
- Create owner user.
- Create BusinessUser with OWNER role.
- Mark invitation as accepted.

## Phase 3 - Customer Management

Goal: business owner can add and block customers.

Tasks:

- Implement CustomerProfile.
- Implement BusinessCustomer.
- Add customer to business.
- Block customer.
- Archive customer.
- Enforce customer access rules.

## Phase 4 - Services and Staff

Goal: business can configure bookable services and staff.

Tasks:

- Create services endpoints.
- Add service validation.
- Create staff endpoints.
- Separate StaffMember from BusinessUser.
- Assign services to staff later.

## Phase 5 - Availability and Appointments

Goal: allow safe appointment booking.

Tasks:

- Add availability rules.
- Add availability exceptions.
- Calculate available slots.
- Create appointment use case.
- Prevent double booking.
- Return 409 Conflict on booking conflict.
- Add appointment status transitions.

## Phase 6 - Notifications and Outbox

Goal: support reliable async notifications.

Tasks:

- Add OutboxEvent model.
- Add Notification model.
- Add worker process.
- Add retry logic.
- Add email provider abstraction.
- Add appointment created and cancelled notifications.

## Phase 7 - Hardening

Goal: prepare the backend for real product usage.

Tasks:

- Add audit logs.
- Add role and permission guards.
- Add integration tests with PostgreSQL.
- Add CI pipeline.
- Add staging environment.
- Add smoke tests.
- Add feature flags.
- Add billing and subscriptions later.
