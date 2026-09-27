import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Permission, SessionUser } from '@shop/contracts';
import { describe, expect, it } from 'vitest';
import { PermissionsGuard } from './permissions.guard.js';

const MANAGER: SessionUser = {
  id: 'u1',
  email: 'manager@demo.shop',
  name: 'Demo Manager',
  role: 'admin',
};

function guardWith(needed: Permission | undefined): PermissionsGuard {
  return new PermissionsGuard({
    getAllAndOverride: () => needed,
  } as unknown as Reflector);
}

function contextFor(user?: SessionUser): ExecutionContext {
  return {
    getHandler: () => () => undefined,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

describe('PermissionsGuard', () => {
  it('lets an unmarked route through: the mark is what asks for a check', () => {
    expect(guardWith(undefined).canActivate(contextFor())).toBe(true);
  });

  it('answers 401, not 403, when nobody authenticated the request', () => {
    expect(() => guardWith('dashboard:read').canActivate(contextFor())).toThrow(
      UnauthorizedException,
    );
  });

  it('lets a role holding the permission through', () => {
    expect(guardWith('dashboard:read').canActivate(contextFor(MANAGER))).toBe(
      true,
    );
  });

  it('refuses a role without the permission', () => {
    expect(() =>
      guardWith('user:manage').canActivate(contextFor(MANAGER)),
    ).toThrow(/Forbidden/);
  });
});
