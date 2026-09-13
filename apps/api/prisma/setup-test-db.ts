/**
 * Prepares the end-to-end test database.
 *
 * Creates it if missing, then brings migrations up to date. Runs before every
 * e2e suite so a fresh checkout needs no manual psql, and so a newly added
 * migration cannot be forgotten.
 */
import 'dotenv/config';
import { execFileSync } from 'node:child_process';
import { Client } from 'pg';

const testUrl = process.env.DATABASE_URL_TEST;

if (!testUrl) {
  console.error(
    'DATABASE_URL_TEST is not set. Copy it from apps/api/.env.example.',
  );
  process.exit(1);
}

const url = new URL(testUrl);
const databaseName = url.pathname.slice(1);

// Connect to the maintenance database: you cannot create a database while
// connected to it.
const adminUrl = new URL(testUrl);
adminUrl.pathname = '/postgres';

const admin = new Client({ connectionString: adminUrl.toString() });
await admin.connect();

const existing = await admin.query(
  'SELECT 1 FROM pg_database WHERE datname = $1',
  [databaseName],
);

if (existing.rowCount === 0) {
  // Identifier cannot be parameterised, hence the quoting by hand.
  await admin.query(`CREATE DATABASE "${databaseName.replace(/"/g, '""')}"`);
  console.log(`Created database ${databaseName}`);
}

await admin.end();

execFileSync('npx', ['prisma', 'migrate', 'deploy'], {
  stdio: 'inherit',
  env: { ...process.env, DATABASE_URL: testUrl, DIRECT_URL: testUrl },
});
