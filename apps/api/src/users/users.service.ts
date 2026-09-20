import { Injectable } from '@nestjs/common';
import type { SessionUser } from '@shop/contracts';
import type { User } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

export function toSessionUser(user: User): SessionUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  create(data: {
    email: string;
    passwordHash: string;
    name: string;
  }): Promise<User> {
    return this.prisma.user.create({ data });
  }
}
