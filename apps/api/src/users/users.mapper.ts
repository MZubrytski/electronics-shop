import type { SessionUser } from '@shop/contracts';
import type { User } from '../generated/prisma/client.js';

export function toSessionUser(user: User): SessionUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}
