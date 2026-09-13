import { AuthResult, Role } from '@shop/contracts';
import { TestContext } from './app.js';

export const TEST_PASSWORD = 'demo1234';

let counter = 0;

/** Unique address per call: tests share a database within a file. */
export function uniqueEmail(prefix = 'user'): string {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}@example.test`;
}

/** Registers someone and hands back the tokens the API issued. */
export async function signUp(
  ctx: TestContext,
  overrides: Partial<{ email: string; password: string; name: string }> = {},
): Promise<AuthResult> {
  const response = await ctx
    .http()
    .post('/auth/sign-up')
    .send({
      email: overrides.email ?? uniqueEmail(),
      password: overrides.password ?? TEST_PASSWORD,
      name: overrides.name ?? 'Test Person',
    })
    .expect(201);

  return response.body as AuthResult;
}

/** Promotes someone straight in the database: no endpoint for this until F10. */
export async function setRole(
  ctx: TestContext,
  userId: string,
  role: Role,
): Promise<void> {
  await ctx.prisma.user.update({ where: { id: userId }, data: { role } });
}

export function bearer(tokens: { accessToken: string }): string {
  return `Bearer ${tokens.accessToken}`;
}
