import 'dotenv/config';

const testUrl = process.env.DATABASE_URL_TEST;

if (!testUrl) {
  throw new Error(
    'DATABASE_URL_TEST is not set. Copy it from apps/api/.env.example and run `npm run db:test:setup`.',
  );
}

process.env.DATABASE_URL = testUrl;
