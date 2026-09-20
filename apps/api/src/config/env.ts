import { z } from 'zod';

export const Env = z
  .object({
    DATABASE_URL: z.string().min(1),
    JWT_ACCESS_SECRET: z.string().min(32),
    JWT_REFRESH_SECRET: z.string().min(32),
    INTERNAL_REQUEST_SECRET: z.string().optional(),
    WEB_ORIGIN: z.string().optional(),
    PORT: z.coerce.number().optional(),
    TRUST_PROXY: z.enum(['0', '1']).optional(),
  })
  .superRefine((env, ctx) => {
    if (env.TRUST_PROXY === '1' && !env.INTERNAL_REQUEST_SECRET) {
      ctx.addIssue({
        code: 'custom',
        path: ['INTERNAL_REQUEST_SECRET'],
        message:
          'required when TRUST_PROXY=1: without it the sign-in rate limit counts every visitor as the storefront',
      });
    }
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
