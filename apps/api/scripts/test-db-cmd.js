/**
 * Cross-platform helper for db:test:migrate and db:test:reset npm scripts.
 *
 * Loads .env.test, maps TEST_DATABASE_URL → DATABASE_URL, then forwards all
 * CLI arguments to the local `prisma` binary. Works on Windows PowerShell and
 * Unix without any extra packages — `dotenv` is already a dev dependency.
 *
 * Usage (via npm scripts):
 *   pnpm --filter api db:test:migrate   →  prisma migrate deploy
 *   pnpm --filter api db:test:reset     →  prisma migrate reset --force
 *
 * Manual (PowerShell, if .env.test does not exist):
 *   $env:TEST_DATABASE_URL="postgresql://...appointment_saas_test..."
 *   pnpm --filter api db:test:migrate
 */
'use strict';

const { config } = require('dotenv');
const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const root = path.join(__dirname, '..');
const envTestPath = path.join(root, '.env.test');

if (fs.existsSync(envTestPath)) {
  // override: true — .env.test values take precedence over any shell export
  config({ path: envTestPath, override: true });
}

if (!process.env.TEST_DATABASE_URL) {
  console.error(
    '\n[db-test] TEST_DATABASE_URL is not set.' +
      '\n\nCreate apps/api/.env.test with:' +
      '\n  TEST_DATABASE_URL=postgresql://appointment_user:appointment_password@localhost:5432/appointment_saas_test?schema=public' +
      '\n\nThis script maps TEST_DATABASE_URL to DATABASE_URL automatically.' +
      '\nDo not also set DATABASE_URL in .env.test.\n',
  );
  process.exit(1);
}

// Ensure prisma uses the test DB
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

// Forward all arguments to prisma.
// shell: true lets Node find `prisma` via the PATH that pnpm injects into
// npm script environments (node_modules/.bin). Works on both cmd.exe and sh.
const args = process.argv.slice(2);
const result = spawnSync('prisma', args, {
  stdio: 'inherit',
  env: process.env,
  shell: true,
});

process.exit(result.status ?? 1);
