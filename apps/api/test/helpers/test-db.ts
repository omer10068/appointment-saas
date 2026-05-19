/**
 * Call requireTestDatabase() at the TOP of any e2e test file that reads from
 * or writes to a real database. It runs at module-load time so Jest aborts the
 * file immediately — before beforeAll or any test — when the guard fails.
 *
 * This prevents DB-based e2e tests from ever accidentally running against the
 * development database when TEST_DATABASE_URL is not configured.
 *
 * Infrastructure-free tests (e.g. health with mocked PrismaService) do NOT
 * need to call this function.
 */
export function requireTestDatabase(): void {
  if (!process.env.TEST_DATABASE_URL) {
    throw new Error(
      '\n' +
        '[e2e] TEST_DATABASE_URL is not set.\n\n' +
        'DB-based e2e tests must run against a dedicated test database to\n' +
        'prevent accidental reads/writes to the development database.\n\n' +
        'Setup:\n' +
        '  1. Create apps/api/.env.test:\n' +
        '       TEST_DATABASE_URL=postgresql://appointment_user:appointment_password@localhost:5432/appointment_saas_test?schema=public\n\n' +
        '     jest-e2e.setup.ts and scripts/test-db-cmd.js both map this to DATABASE_URL\n' +
        '     automatically — do not also set DATABASE_URL in .env.test.\n\n' +
        '  2. Apply migrations to the test database:\n' +
        '       pnpm --filter api db:test:migrate\n\n' +
        '  3. Re-run tests:\n' +
        '       pnpm --filter api test:e2e\n',
    );
  }
}
