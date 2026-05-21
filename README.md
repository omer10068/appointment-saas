# Appointment SaaS

Closed multi-tenant B2B SaaS for appointment scheduling.

## Product

Platform admins create businesses manually.  
Business owners cannot self-register.  
End customers can access only businesses that explicitly added them and did not block them.

## Stack

- Monorepo: pnpm + Turborepo
- Backend: NestJS + TypeScript
- Database: PostgreSQL
- ORM: Prisma 7
- Authentication: Clerk
- Local infrastructure: Docker Compose
- Testing: Jest + Supertest (unit + e2e); e2e tests run against a real PostgreSQL test database
- Frontend (in progress): Next.js + React

## Project Structure

```text
appointment-saas/
  apps/
    api/          — NestJS backend
    web/          — Next.js frontend (in progress)
  packages/
    contracts/    — Shared TypeScript types
  docs/           — Architecture and design docs
  docker-compose.yml
  pnpm-workspace.yaml
  turbo.json
```

## Local Setup

### Prerequisites

- Node.js 20+
- pnpm 9+
- Docker Desktop

### 1. Install dependencies

```bash
pnpm install
```

### 2. Start the database

```bash
docker compose up -d
```

### 3. Configure environment variables

Copy `.env.example` to `.env` in `apps/api/` and fill in the values:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/appointment_saas
CLERK_SECRET_KEY=sk_test_...
```

### 4. Run migrations

```bash
cd apps/api
pnpm exec prisma migrate deploy
```

### 5. Seed the database

```bash
cd apps/api
pnpm exec tsx prisma/seed.ts
```

### 6. Start the API

```bash
cd apps/api
pnpm start:dev
```

## Prisma Commands

Run from `apps/api/`:

```bash
pnpm exec prisma validate          # Validate schema
pnpm exec prisma generate          # Regenerate Prisma client
pnpm exec prisma migrate deploy    # Apply pending migrations
pnpm exec prisma migrate dev --name <name>  # Create a new migration
pnpm exec prisma format            # Format schema file
```

## Test Database Setup

DB-based e2e tests require a separate test database. Both databases start with:

```bash
docker compose up -d
```

Set `TEST_DATABASE_URL` in `apps/api/.env.test` pointing at the test database (never the dev database). Every e2e suite that writes real rows calls `requireTestDatabase()` at module level — this aborts the suite immediately if `TEST_DATABASE_URL` is not set.

E2E tests use `MockClerkAuthGuard` instead of real Clerk JWTs. Tests are serialized with `maxWorkers: 1` to avoid DB connection exhaustion under parallel NestJS app instances.

## Running Tests

Prefer monorepo-filtered commands from the repo root:

```bash
pnpm --filter api test         # Unit tests
pnpm --filter api test:e2e     # E2E tests
pnpm --filter api lint         # Lint
pnpm --filter api build        # Build
```

## Role Model

Business users have one of three dashboard roles:

| Role | Description |
| --- | --- |
| `OWNER` | Full control — settings, users, billing |
| `MANAGER` | Operational access — services, customers, appointments, service providers |
| `MEMBER` | Basic dashboard user — can read dashboard data; mutation permissions are reviewed explicitly per domain |

`ServiceProvider` is a separate concept from the `MEMBER` role — it is a bookable calendar entity that may be linked to a `BusinessUser` but is independent of the dashboard role. Routes use `/service-providers`.

See [docs/rbac.md](docs/rbac.md) for the full permission matrix.

## Current Backend Status

Read-only dashboard E2E coverage is green for the currently implemented read endpoints (9 suites / 67 tests).  
The next phase is mutation tests by domain, starting with services.  
See [docs/backend-roadmap.md](docs/backend-roadmap.md) for detailed progress and the recommended mutation test order.
