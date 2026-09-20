import { AuthResult } from '@shop/contracts';
import { TestContext, createTestApp, resetState } from './helpers/app.js';
import {
  TEST_PASSWORD,
  bearer,
  setRole,
  signUp,
  uniqueEmail,
} from './helpers/auth.js';

describe('Auth (e2e)', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  beforeEach(async () => {
    await resetState(ctx);
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  describe('sign-up', () => {
    it('registers someone and opens a session straight away', async () => {
      const email = uniqueEmail();

      const response = await ctx
        .http()
        .post('/auth/sign-up')
        .send({ email, password: TEST_PASSWORD, name: 'Ada Lovelace' })
        .expect(201);

      const body = AuthResult.parse(response.body);
      expect(body.user.email).toBe(email);
      expect(body.user.role).toBe('user');
      expect(body.tokens.accessToken).toBeTruthy();
      expect(body.tokens.refreshToken).toBeTruthy();
    });

    it('never lets the password hash out', async () => {
      const response = await ctx
        .http()
        .post('/auth/sign-up')
        .send({ email: uniqueEmail(), password: TEST_PASSWORD, name: 'Ada' })
        .expect(201);

      expect(JSON.stringify(response.body)).not.toContain('passwordHash');
      expect(JSON.stringify(response.body)).not.toContain(TEST_PASSWORD);
    });

    it('rejects an address that is already taken', async () => {
      const email = uniqueEmail();
      await signUp(ctx, { email });

      await ctx
        .http()
        .post('/auth/sign-up')
        .send({ email, password: TEST_PASSWORD, name: 'Impostor' })
        .expect(409);
    });

    it('rejects input that fails the contract', async () => {
      await ctx
        .http()
        .post('/auth/sign-up')
        .send({ email: 'not-an-email', password: 'short', name: '' })
        .expect(400);
    });
  });

  describe('sign-in', () => {
    it('signs in with the right password', async () => {
      const email = uniqueEmail();
      await signUp(ctx, { email });

      const response = await ctx
        .http()
        .post('/auth/sign-in')
        .send({ email, password: TEST_PASSWORD })
        .expect(200);

      expect(AuthResult.parse(response.body).user.email).toBe(email);
    });

    it('rejects a wrong password without issuing anything', async () => {
      const email = uniqueEmail();
      await signUp(ctx, { email });

      const response = await ctx
        .http()
        .post('/auth/sign-in')
        .send({ email, password: 'wrong-password' })
        .expect(401);

      expect(response.body).not.toHaveProperty('tokens');
    });

    it('answers an unknown address the same way as a wrong password', async () => {
      await ctx
        .http()
        .post('/auth/sign-in')
        .send({ email: uniqueEmail(), password: TEST_PASSWORD })
        .expect(401);
    });
  });

  describe('profile', () => {
    it('refuses without a token', async () => {
      await ctx.http().get('/auth/me').expect(401);
    });

    it('refuses a made-up token', async () => {
      await ctx
        .http()
        .get('/auth/me')
        .set('Authorization', 'Bearer not-a-real-token')
        .expect(401);
    });

    it('returns the profile without internal fields', async () => {
      const { tokens, user } = await signUp(ctx);

      const response = await ctx
        .http()
        .get('/auth/me')
        .set('Authorization', bearer(tokens))
        .expect(200);

      expect(response.body).toEqual(user);
      expect(response.body).not.toHaveProperty('passwordHash');
    });

    it('reflects a role change immediately, not in fifteen minutes', async () => {
      const { tokens, user } = await signUp(ctx);
      await setRole(ctx, user.id, 'admin');

      const response = await ctx
        .http()
        .get('/auth/me')
        .set('Authorization', bearer(tokens))
        .expect(200);

      expect(response.body.role).toBe('admin');
    });

    it('refuses a token whose owner is gone', async () => {
      const { tokens, user } = await signUp(ctx);
      await ctx.prisma.user.delete({ where: { id: user.id } });

      await ctx
        .http()
        .get('/auth/me')
        .set('Authorization', bearer(tokens))
        .expect(401);
    });
  });

  describe('refresh', () => {
    it('issues a new pair and spends the old token', async () => {
      const { tokens } = await signUp(ctx);

      const response = await ctx
        .http()
        .post('/auth/refresh')
        .send({ refreshToken: tokens.refreshToken })
        .expect(200);

      const next = AuthResult.parse(response.body);
      expect(next.tokens.refreshToken).not.toBe(tokens.refreshToken);

      await ctx
        .http()
        .post('/auth/refresh')
        .send({ refreshToken: next.tokens.refreshToken })
        .expect(200);
    });

    it('rejects a token it never issued', async () => {
      await ctx
        .http()
        .post('/auth/refresh')
        .send({ refreshToken: 'made-up-token' })
        .expect(401);
    });

    it('kills the family when a spent token comes back', async () => {
      const { tokens } = await signUp(ctx);

      const rotated = await ctx
        .http()
        .post('/auth/refresh')
        .send({ refreshToken: tokens.refreshToken })
        .expect(200);
      const fresh = AuthResult.parse(rotated.body).tokens;

      await ctx
        .http()
        .post('/auth/refresh')
        .send({ refreshToken: tokens.refreshToken })
        .expect(401);

      await ctx
        .http()
        .post('/auth/refresh')
        .send({ refreshToken: fresh.refreshToken })
        .expect(401);
    });

    it('spends a token once even when two requests arrive together', async () => {
      const { tokens } = await signUp(ctx);

      const results = await Promise.all([
        ctx
          .http()
          .post('/auth/refresh')
          .send({ refreshToken: tokens.refreshToken }),
        ctx
          .http()
          .post('/auth/refresh')
          .send({ refreshToken: tokens.refreshToken }),
      ]);

      const accepted = results.filter((r) => r.status === 200);
      expect(accepted).toHaveLength(1);
    });

    it('leaves other sign-ins alone when one family is compromised', async () => {
      const email = uniqueEmail();
      const first = await signUp(ctx, { email });

      const secondResponse = await ctx
        .http()
        .post('/auth/sign-in')
        .send({ email, password: TEST_PASSWORD })
        .expect(200);
      const second = AuthResult.parse(secondResponse.body).tokens;

      await ctx
        .http()
        .post('/auth/refresh')
        .send({ refreshToken: first.tokens.refreshToken })
        .expect(200);
      await ctx
        .http()
        .post('/auth/refresh')
        .send({ refreshToken: first.tokens.refreshToken })
        .expect(401);

      await ctx
        .http()
        .post('/auth/refresh')
        .send({ refreshToken: second.refreshToken })
        .expect(200);
    });

    it('hands out one token when the same one is refreshed twice at once', async () => {
      const { tokens } = await signUp(ctx);

      const results = await Promise.all([
        ctx
          .http()
          .post('/auth/refresh')
          .send({ refreshToken: tokens.refreshToken }),
        ctx
          .http()
          .post('/auth/refresh')
          .send({ refreshToken: tokens.refreshToken }),
      ]);

      const statuses = results.map((r) => r.status).sort();
      expect(statuses).toEqual([200, 401]);
    });

    it('stops refreshing once the family hits its ceiling', async () => {
      const { tokens, user } = await signUp(ctx);

      await ctx.prisma.refreshToken.updateMany({
        where: { userId: user.id },
        data: { familyExpiresAt: new Date(Date.now() - 1000) },
      });

      await ctx
        .http()
        .post('/auth/refresh')
        .send({ refreshToken: tokens.refreshToken })
        .expect(401);
    });

    it('keeps the ceiling where it was across a rotation', async () => {
      const { tokens, user } = await signUp(ctx);
      const before = await ctx.prisma.refreshToken.findFirstOrThrow({
        where: { userId: user.id },
      });

      const response = await ctx
        .http()
        .post('/auth/refresh')
        .send({ refreshToken: tokens.refreshToken })
        .expect(200);

      const after = await ctx.prisma.refreshToken.findFirstOrThrow({
        where: { userId: user.id, revokedAt: null },
      });

      expect(after.familyExpiresAt.getTime()).toBe(
        before.familyExpiresAt.getTime(),
      );
      expect(AuthResult.parse(response.body).tokens.refreshToken).toBeTruthy();
    });
  });

  describe('sign-out', () => {
    it('makes the refresh token unusable', async () => {
      const { tokens } = await signUp(ctx);

      await ctx
        .http()
        .post('/auth/sign-out')
        .send({ refreshToken: tokens.refreshToken })
        .expect(200);

      await ctx
        .http()
        .post('/auth/refresh')
        .send({ refreshToken: tokens.refreshToken })
        .expect(401);
    });
  });

  describe('rate limiting', () => {
    it('cannot be dodged by changing the case of the path', async () => {
      const email = uniqueEmail();
      await signUp(ctx, { email });

      for (let attempt = 0; attempt < 10; attempt += 1) {
        await ctx
          .http()
          .post('/auth/sign-in')
          .send({ email, password: 'wrong-password' })
          .expect(401);
      }

      await ctx
        .http()
        .post('/AUTH/SIGN-IN')
        .send({ email, password: 'wrong-password' })
        .expect(429);
    });

    it('cuts off after ten attempts a minute from one address', async () => {
      const email = uniqueEmail();
      await signUp(ctx, { email });

      for (let attempt = 0; attempt < 10; attempt += 1) {
        await ctx
          .http()
          .post('/auth/sign-in')
          .send({ email, password: 'wrong-password' })
          .expect(401);
      }

      await ctx
        .http()
        .post('/auth/sign-in')
        .send({ email, password: TEST_PASSWORD })
        .expect(429);
    });
  });
});
