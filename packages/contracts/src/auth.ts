import { z } from 'zod'

export const Role = z.enum(['user', 'admin', 'super_admin'])
export type Role = z.infer<typeof Role>

/**
 * Minimum length only. Composition rules ("one digit, one capital") push people
 * towards `Password1!` and buy nothing — length is what actually helps.
 */
const password = z.string().min(8).max(128)

export const SignUpInput = z.object({
  email: z.email().max(255),
  password,
  name: z.string().trim().min(1).max(100),
})
export type SignUpInput = z.infer<typeof SignUpInput>

export const SignInInput = z.object({
  email: z.email().max(255),
  password,
})
export type SignInInput = z.infer<typeof SignInInput>

/** What the storefront is allowed to know about the signed-in person. */
export const SessionUser = z.object({
  id: z.string(),
  email: z.email(),
  name: z.string(),
  role: Role,
})
export type SessionUser = z.infer<typeof SessionUser>

/**
 * The API hands tokens back in the body; the storefront turns them into
 * cookies, because it owns the origin the browser talks to.
 * See docs/features/F1-auth.md, section 3.5.
 */
export const AuthTokens = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
})
export type AuthTokens = z.infer<typeof AuthTokens>

export const AuthResult = z.object({
  user: SessionUser,
  tokens: AuthTokens,
})
export type AuthResult = z.infer<typeof AuthResult>

export const RefreshInput = z.object({
  refreshToken: z.string().min(1),
})
export type RefreshInput = z.infer<typeof RefreshInput>
