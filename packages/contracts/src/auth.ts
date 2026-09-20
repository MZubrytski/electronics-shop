import { z } from 'zod'

export const Role = z.enum(['user', 'admin', 'super_admin'])
export type Role = z.infer<typeof Role>

const password = z.string().min(8).max(128)

const email = z
  .email()
  .max(255)
  .transform((value) => value.toLowerCase())

export const SignUpInput = z.object({
  email,
  password,
  name: z.string().trim().min(1).max(100),
})
export type SignUpInput = z.infer<typeof SignUpInput>

export const SignInInput = z.object({
  email,
  password,
})
export type SignInInput = z.infer<typeof SignInInput>

export const SessionUser = z.object({
  id: z.string(),
  email: z.email(),
  name: z.string(),
  role: Role,
})
export type SessionUser = z.infer<typeof SessionUser>

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
