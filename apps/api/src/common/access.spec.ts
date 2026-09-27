import { describe, expect, it } from 'vitest';
import {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  can,
  type Permission,
  type Role,
} from '@shop/contracts';

const PRD_SECTION_2: Array<{
  row: string;
  permission: Permission;
  roles: Role[];
}> = [
  {
    row: 'Proceed to checkout',
    permission: 'checkout:write',
    roles: ['user', 'admin', 'super_admin'],
  },
  {
    row: 'Own order history',
    permission: 'order:read:own',
    roles: ['user', 'admin', 'super_admin'],
  },
  {
    row: 'Wishlist',
    permission: 'wishlist:write',
    roles: ['user', 'admin', 'super_admin'],
  },
  {
    row: 'Write a review',
    permission: 'review:write',
    roles: ['user', 'admin', 'super_admin'],
  },
  {
    row: 'Edit or delete own review',
    permission: 'review:update:own',
    roles: ['user', 'admin', 'super_admin'],
  },
  {
    row: 'Dashboard: revenue, top products',
    permission: 'dashboard:read',
    roles: ['admin', 'super_admin'],
  },
  {
    row: 'All orders and status changes',
    permission: 'order:manage',
    roles: ['admin', 'super_admin'],
  },
  {
    row: 'Stock levels, read only',
    permission: 'inventory:read',
    roles: ['admin', 'super_admin'],
  },
  {
    row: 'Delete any review',
    permission: 'review:delete:any',
    roles: ['super_admin'],
  },
  {
    row: 'Create, edit and delete products',
    permission: 'product:write',
    roles: ['super_admin'],
  },
  {
    row: 'Upload product images',
    permission: 'product:image:write',
    roles: ['super_admin'],
  },
  {
    row: 'Edit stock by hand',
    permission: 'inventory:write',
    roles: ['super_admin'],
  },
  {
    row: 'List users and change roles',
    permission: 'user:manage',
    roles: ['super_admin'],
  },
];

const ALL_ROLES: Role[] = ['user', 'admin', 'super_admin'];

describe('permission map against the PRD §2 matrix', () => {
  it('covers every row of the matrix and nothing beyond it', () => {
    expect([...PERMISSIONS].sort()).toEqual(
      PRD_SECTION_2.map((r) => r.permission).sort(),
    );
  });

  it.each(PRD_SECTION_2)('$row', ({ permission, roles }) => {
    for (const role of ALL_ROLES) {
      expect(can(role, permission)).toBe(roles.includes(role));
    }
  });

  it('never grants a role a permission that is not on the list', () => {
    for (const role of ALL_ROLES) {
      for (const granted of ROLE_PERMISSIONS[role]) {
        expect(PERMISSIONS).toContain(granted);
      }
    }
  });
});
