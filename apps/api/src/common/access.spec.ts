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
    row: 'Перейти к оплате',
    permission: 'checkout:write',
    roles: ['user', 'admin', 'super_admin'],
  },
  {
    row: 'История своих заказов',
    permission: 'order:read:own',
    roles: ['user', 'admin', 'super_admin'],
  },
  {
    row: 'Wishlist',
    permission: 'wishlist:write',
    roles: ['user', 'admin', 'super_admin'],
  },
  {
    row: 'Написать отзыв',
    permission: 'review:write',
    roles: ['user', 'admin', 'super_admin'],
  },
  {
    row: 'Изменить или удалить свой отзыв',
    permission: 'review:update:own',
    roles: ['user', 'admin', 'super_admin'],
  },
  {
    row: 'Дашборд: выручка, топ товаров',
    permission: 'dashboard:read',
    roles: ['admin', 'super_admin'],
  },
  {
    row: 'Список всех заказов, смена статуса',
    permission: 'order:manage',
    roles: ['admin', 'super_admin'],
  },
  {
    row: 'Остатки на складе (просмотр)',
    permission: 'inventory:read',
    roles: ['admin', 'super_admin'],
  },
  {
    row: 'Удалить любой отзыв',
    permission: 'review:delete:any',
    roles: ['super_admin'],
  },
  {
    row: 'Создание, изменение, удаление товаров',
    permission: 'product:write',
    roles: ['super_admin'],
  },
  {
    row: 'Загрузка изображений товаров',
    permission: 'product:image:write',
    roles: ['super_admin'],
  },
  {
    row: 'Изменение остатка вручную',
    permission: 'inventory:write',
    roles: ['super_admin'],
  },
  {
    row: 'Список пользователей, смена ролей',
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
