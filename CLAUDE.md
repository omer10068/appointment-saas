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
- Local infrastructure: Docker Compose
- Frontend later: Next.js + React + TypeScript
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

## Core Architecture Rules

- Every business-owned table must include `businessId`.
- Do not trust `businessId` from the client.
- Tenant isolation must be enforced in backend guards/services.
- Keep modules isolated and focused.
- Do not create microservices at this stage.
- Use Modular Monolith architecture.
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

## Workflow

Before editing:

1. Inspect relevant files.
2. Explain what you found.
3. Propose a plan.
4. Wait for approval.

After editing:

1. Summarize changed files.
2. Explain risks.
3. Run relevant build/test command if possible.
4. Show what passed or failed.

## Commands

From root:

- `pnpm build`
- `pnpm lint`
- `pnpm test`
- `docker compose up -d`
- `docker ps`

From `apps/api`:

- `pnpm start:dev`
- `pnpm build`
- `pnpm lint`
- `pnpm prisma validate`
- `pnpm prisma migrate dev`
- `pnpm prisma generate`

## Do Not Commit

- `node_modules/`
- `.env`
- `dist/`
- `.turbo/`
- `apps/api/src/generated/`
