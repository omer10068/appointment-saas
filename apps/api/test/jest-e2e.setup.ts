import { config } from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';

const root = resolve(__dirname, '..');

// ── Step 1: Load .env.test (test-specific values, highest priority) ──────────
//
// .env.test must NOT be committed. Define only TEST_DATABASE_URL here:
//   TEST_DATABASE_URL=postgresql://...appointment_saas_test...
//
// Do NOT also set DATABASE_URL in .env.test — this file and
// scripts/test-db-cmd.js both map TEST_DATABASE_URL → DATABASE_URL
// automatically, keeping TEST_DATABASE_URL as the single source of truth.
//
// dotenv.config() never overwrites a variable that is already set in
// process.env, so a shell-level export always wins over the file.
const envTestPath = resolve(root, '.env.test');
if (existsSync(envTestPath)) {
  config({ path: envTestPath });
}

// ── Step 2: Load .env as fallback (non-sensitive defaults) ───────────────────
//
// Provides CLERK keys, PORT, etc. for tests that need them.
// Any key already populated by .env.test (or the shell) is left untouched.
config({ path: resolve(root, '.env') });

// ── Step 3: Wire TEST_DATABASE_URL → DATABASE_URL ────────────────────────────
//
// Allows .env.test to only declare TEST_DATABASE_URL. DB-based e2e tests call
// requireTestDatabase() (test/helpers/test-db.ts) to abort immediately when
// this variable is absent — they must never fall back to the dev database.
if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}
