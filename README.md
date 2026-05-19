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
- Local infrastructure: Docker Compose
- Frontend (planned): Next.js + React

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
pnpm exec prisma migrate dev --name <name>  # Create a new migration (interactive)
pnpm exec prisma format            # Format schema file
```

## Test Database Setup

E2E tests use a separate `appointment_saas_test` database. Start it alongside the dev DB:

```bash
docker compose up -d
```

The test database URL is configured in `apps/api/test/jest-e2e.json` via `TEST_DATABASE_URL`.

## Running Tests

### Unit tests

```bash
pnpm test
# or from apps/api:
cd apps/api && pnpm test
```

### E2E tests

```bash
cd apps/api && pnpm run test:e2e
```

### Build

```bash
pnpm build
```

## Role Model

Business users have one of three dashboard roles:

| Role | Description |
| --- | --- |
| `OWNER` | Full control — settings, users, billing |
| `MANAGER` | Operational access — services, customers, appointments, staff |
| `MEMBER` | Read access plus limited operational permissions |

`StaffMember` is a separate concept — a bookable calendar entity that may be linked to a `BusinessUser` but is independent of the dashboard role.

See [docs/rbac.md](docs/rbac.md) for the full permission matrix.
