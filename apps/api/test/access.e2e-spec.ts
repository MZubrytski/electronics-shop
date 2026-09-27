import { AccessProbe, ROLE_PERMISSIONS, Role } from '@shop/contracts';
import { TestContext, createTestApp, resetState } from './helpers/app.js';
import { bearer, setRole, signUp } from './helpers/auth.js';

async function tokenFor(ctx: TestContext, role: Role): Promise<string> {
  const result = await signUp(ctx);
  await setRole(ctx, result.user.id, role);
  return bearer(result.tokens);
}

describe('Access control (e2e)', () => {
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

  describe('GET /admin/probe — needs dashboard:read', () => {
    it('turns a guest away before anything else', async () => {
      await ctx.http().get('/admin/probe').expect(401);
    });

    it('refuses a customer with 403', async () => {
      await ctx
        .http()
        .get('/admin/probe')
        .set('Authorization', await tokenFor(ctx, 'user'))
        .expect(403);
    });

    it('lets a manager through', async () => {
      const response = await ctx
        .http()
        .get('/admin/probe')
        .set('Authorization', await tokenFor(ctx, 'admin'))
        .expect(200);

      const probe = AccessProbe.parse(response.body);
      expect(probe.role).toBe('admin');
      expect(probe.permissions).toEqual([...ROLE_PERMISSIONS.admin]);
    });

    it('lets the owner through', async () => {
      const response = await ctx
        .http()
        .get('/admin/probe')
        .set('Authorization', await tokenFor(ctx, 'super_admin'))
        .expect(200);

      const probe = AccessProbe.parse(response.body);
      expect(probe.role).toBe('super_admin');
      expect(probe.permissions).toEqual([...ROLE_PERMISSIONS.super_admin]);
    });
  });

  describe('GET /admin/probe/owner — needs user:manage', () => {
    it('refuses a customer with 403', async () => {
      await ctx
        .http()
        .get('/admin/probe/owner')
        .set('Authorization', await tokenFor(ctx, 'user'))
        .expect(403);
    });

    it('refuses a manager with 403: only the owner holds this one', async () => {
      await ctx
        .http()
        .get('/admin/probe/owner')
        .set('Authorization', await tokenFor(ctx, 'admin'))
        .expect(403);
    });

    it('lets the owner through', async () => {
      const response = await ctx
        .http()
        .get('/admin/probe/owner')
        .set('Authorization', await tokenFor(ctx, 'super_admin'))
        .expect(200);

      const probe = AccessProbe.parse(response.body);
      expect(probe.role).toBe('super_admin');
      expect(probe.permissions).toEqual([...ROLE_PERMISSIONS.super_admin]);
    });
  });

  it('refuses with a plain Nest error, not a hand-written body', async () => {
    const response = await ctx
      .http()
      .get('/admin/probe')
      .set('Authorization', await tokenFor(ctx, 'user'))
      .expect(403);

    expect(response.body).toMatchObject({ statusCode: 403 });
  });
});
