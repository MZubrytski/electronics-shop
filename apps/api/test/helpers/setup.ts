import 'dotenv/config';

/**
 * Every test run talks to DATABASE_URL_TEST, never to the working database:
 * the cleanup below truncates tables, and pointing that at real data once
 * would be enough to regret it.
 */
const testUrl = process.env.DATABASE_URL_TEST;

if (!testUrl) {
  throw new Error(
    'DATABASE_URL_TEST is not set. Copy it from apps/api/.env.example and run `npm run db:test:setup`.',
  );
}

process.env.DATABASE_URL = testUrl;
