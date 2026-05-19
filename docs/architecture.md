# Architecture

## Product Type

Closed multi-tenant B2B SaaS for appointment scheduling.

The system is not an open marketplace. Platform admins create businesses manually. Business owners cannot self-register.

## Main Actors

### Platform Admin

The system operator. Creates businesses manually and manages business onboarding.

### Business Owner

A paying business customer. Owns and manages a business inside the platform.

### Staff

A business-side user or bookable resource that may receive appointments.

### End Customer

A customer of a business. Can access only businesses that explicitly added them and did not block them.

## Stack

- Monorepo: pnpm + Turborepo
- Backend: NestJS + TypeScript
- Database: PostgreSQL
- ORM: Prisma 7
- Local infrastructure: Docker Compose
- Frontend later: Next.js + React

## Architecture Style

Modular Monolith.

The backend starts as one deployable NestJS API, divided into clear modules. This keeps development simple while preserving the ability to extract modules later if needed.

## Planned Backend Modules

- AuthModule
- AdminModule
- BusinessesModule
- BusinessUsersModule
- CustomersModule
- ServicesModule
- ServiceProvidersModule
- AvailabilityModule
- AppointmentsModule
- NotificationsModule
- AuditLogsModule
- BillingModule later

## Multi-Tenancy Model

Shared PostgreSQL database with tenant-scoped rows.

Each business is a tenant. Most business-owned tables must include businessId.

Examples:

- services
- service_providers
- business_customers
- appointments
- availability_rules
- notifications
- audit_logs

## Tenant Isolation

Tenant isolation must be enforced in the backend.

Frontend display rules are not security.

Every sensitive backend operation must verify:

- current user identity
- business membership
- role or permission
- business status
- customer status where relevant

## Customer Access Rule

A customer may access a business only if:

1. The business exists.
2. The business is active.
3. The business explicitly added the customer.
4. The customer status for that business is ACTIVE.
5. The customer is not blocked.

## Data Model Principles

- User represents an authenticated identity.
- Business represents a tenant.
- BusinessUser connects users to businesses as owners, managers, or staff.
- CustomerProfile represents the person.
- BusinessCustomer represents the relationship between a customer and a specific business.
- ServiceProvider is separated from BusinessUser.
- Appointment belongs to a business and is created only through appointment use cases.

## Time Handling

- Store appointment times in UTC.
- Store business timezone, locale, and currency.
- Render times in the business timezone.

## Async Work

Do not send email, SMS, or WhatsApp messages directly inside critical request flows.

Use an outbox or event pattern later:

1. Perform the business action inside a transaction.
2. Write an outbox event.
3. A worker processes the event.
4. The notification is sent with retry support, or staff.

- CustomerProfile represents the person.
- BusinessCustomer represents the relationship between a customer and a specific business.
- ServiceProvider is separated from Business.

## Current Foundation Status

Completed:

- Monorepo foundation
- NestJS API
- PostgreSQL via Docker Compose
- Prisma 7 setup
- Prisma Client generation
- ConfigModule setup
- PrismaModule and PrismaService
- Health endpoint connected to PostgreSQL
