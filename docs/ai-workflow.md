# AI Workflow

## Goal

Use AI tools to speed up development without losing engineering control.

AI should help with planning, implementation, debugging, refactoring, and tests, but the developer stays responsible for architecture, security, Git, and final decisions.

## Tools

- ChatGPT: architecture, explanations, planning, review, prompt design.
- Claude Code: codebase edits, implementation, refactoring, tests.
- VS Code: primary editor.
- Git: source control and review boundary.

## Core Rules

- AI must inspect files before editing.
- AI must propose a plan before implementation.
- Changes must be small and reviewable.
- Every change must be checked with `git diff`.
- Build/lint/tests should run after meaningful changes.
- AI must not touch `.env`, secrets, or production config.
- AI must not commit or push without explicit approval.
- AI must not refactor unrelated files.

## Standard Flow

1. Define the task.
2. Ask AI to inspect relevant files.
3. Ask AI for a plan.
4. Approve one step at a time.
5. Review the diff.
6. Run build/lint/tests.
7. Commit manually.

## Good Prompt Example

Task:
Create the BusinessesModule with a create business endpoint.

Rules:

- Do not edit unrelated files.
- Use DTO validation.
- Do not implement auth yet.
- Keep tenant architecture in mind.
- Inspect the existing project structure first.
- Propose a plan before editing.

## Bad Prompt Example

Build the backend.

## Debugging Prompt

When there is an error, use this prompt:

Explain the error first.
Identify the root cause.
Suggest two possible fixes.
Recommend the safer fix.
Do not edit yet.

## Code Review Prompt

After AI changes files, use this prompt:

Review this diff as a senior backend engineer.

Look for:

- security issues
- tenant isolation risks
- overengineering
- missing validation
- bad module boundaries
- testability problems
- unrelated changes

## Project Context

Closed multi-tenant appointment scheduling SaaS.

Platform admins create businesses manually.
Business owners cannot self-register.
Customers can access only businesses that explicitly added them and did not block them.

## Stack

- Monorepo: pnpm + Turborepo
- Backend: NestJS + TypeScript
- Database: PostgreSQL
- ORM: Prisma 7
- Frontend: Next.js + React (active, under `apps/web`)
- Architecture: Modular Monolith
