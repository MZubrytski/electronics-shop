import { z } from 'zod';

/**
 * Checked once at startup, so a deployment missing a secret fails to boot
 * instead of booting green and throwing a 500 at the first person who tries
 * to sign in.
 */
export const Env = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  WEB_ORIGIN: z.string().optional(),
  PORT: z.coerce.number().optional(),
  TRUST_PROXY: z.enum(['0', '1']).optional(),
});

export function validateEnv(raw: Record<string, unknown>) {
  const result = Env.safeParse(raw);

  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');

    throw new Error(
      `Environment is not usable:\n${problems}\n\nSee apps/api/.env.example.`,
    );
  }

  return result.data;
}
