import { UseGuards, applyDecorators } from '@nestjs/common';
import type { Permission } from '@shop/contracts';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { PermissionsGuard } from './permissions.guard.js';
import { RequirePermission } from './require-permission.decorator.js';

// The two guards only work in this order: PermissionsGuard reads the user
// JwtAuthGuard puts on the request. Pairing them here is what keeps a route
// from silently shipping with one of them missing.
export function Auth(permission: Permission) {
  return applyDecorators(
    UseGuards(JwtAuthGuard, PermissionsGuard),
    RequirePermission(permission),
  );
}
