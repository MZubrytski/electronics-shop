import { z } from 'zod'
import { Role } from './auth.js'

export const PERMISSIONS = [
  'checkout:write',
  'order:read:own',
  'wishlist:write',
  'review:write',
  'review:update:own',
  'dashboard:read',
  'order:manage',
  'inventory:read',
  'review:delete:any',
  'product:write',
  'product:image:write',
  'inventory:write',
  'user:manage',
] as const

export const Permission = z.enum(PERMISSIONS)
export type Permission = z.infer<typeof Permission>

const CUSTOMER = [
  'checkout:write',
  'order:read:own',
  'wishlist:write',
  'review:write',
  'review:update:own',
] as const satisfies readonly Permission[]

const MANAGER = [
  ...CUSTOMER,
  'dashboard:read',
  'order:manage',
  'inventory:read',
] as const satisfies readonly Permission[]

const OWNER = [
  ...MANAGER,
  'review:delete:any',
  'product:write',
  'product:image:write',
  'inventory:write',
  'user:manage',
] as const satisfies readonly Permission[]

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  user: CUSTOMER,
  admin: MANAGER,
  super_admin: OWNER,
}

export function can(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission)
}

export const AccessProbe = z.object({
  ok: z.literal(true),
  role: Role,
  permissions: z.array(Permission),
})
export type AccessProbe = z.infer<typeof AccessProbe>
