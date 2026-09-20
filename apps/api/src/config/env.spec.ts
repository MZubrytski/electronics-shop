import { describe, expect, it } from 'vitest';
import { validateEnv } from './env.js';

const base = {
  DATABASE_URL: 'postgresql://shop:shop@localhost:5432/shop',
  JWT_ACCESS_SECRET: 'a'.repeat(32),
  JWT_REFRESH_SECRET: 'b'.repeat(32),
};

describe('validateEnv', () => {
  it('accepts a local setup without a proxy', () => {
    expect(validateEnv({ ...base, TRUST_PROXY: '0' })).toMatchObject({
      TRUST_PROXY: '0',
    });
  });

  it('refuses to boot behind a proxy without the shared secret', () => {
    expect(() => validateEnv({ ...base, TRUST_PROXY: '1' })).toThrow(
      /INTERNAL_REQUEST_SECRET/,
    );
  });

  it('accepts a proxy setup once the secret is there', () => {
    expect(
      validateEnv({
        ...base,
        TRUST_PROXY: '1',
        INTERNAL_REQUEST_SECRET: 'c'.repeat(32),
      }),
    ).toMatchObject({ TRUST_PROXY: '1' });
  });

  it('names the missing variable instead of failing silently', () => {
    expect(() => validateEnv({})).toThrow(/DATABASE_URL/);
  });
});
