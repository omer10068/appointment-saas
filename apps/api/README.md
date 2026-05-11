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
- Frontend later: Next.js + React

## Project Structure

```text
appointment-saas/
  apps/
    api/
  packages/
  docs/
  docker-compose.yml
  pnpm-workspace.yaml
  turbo.json
  