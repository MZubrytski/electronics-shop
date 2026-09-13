import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { AuthResult, SignInInput, SignUpInput } from '@shop/contracts';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { UsersService, toSessionUser } from '../users/users.service.js';
import { PasswordService } from './password.service.js';
import { REFRESH_TOKEN_TTL_MS, TokensService } from './tokens.service.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly passwords: PasswordService,
    private readonly tokens: TokensService,
  ) {}

  async signUp(input: SignUpInput): Promise<AuthResult> {
    const existing = await this.users.findByEmail(input.email);

    if (existing) {
      throw new ConflictException('This email is already registered');
    }

    const user = await this.users.create({
      email: input.email,
      name: input.name,
      passwordHash: await this.passwords.hash(input.password),
    });

    return this.startSession(user.id, toSessionUser(user));
  }

  async signIn(input: SignInInput): Promise<AuthResult> {
    const user = await this.users.findByEmail(input.email);

    // Same answer for an unknown address and a wrong password: telling them
    // apart would turn sign-in into a way to enumerate customers.
    const ok =
      user !== null &&
      (await this.passwords.verify(user.passwordHash, input.password));

    if (!user || !ok) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.startSession(user.id, toSessionUser(user));
  }

  /**
   * Rotation, plus the trap for a stolen token.
   *
   * Everything happens in one transaction: without it two simultaneous
   * requests could both spend the same token and both be handed a new one.
   */
  async refresh(presented: string): Promise<AuthResult> {
    const tokenHash = this.tokens.hashRefreshToken(presented);

    const rotated = await this.prisma.$transaction(async (tx) => {
      const stored = await tx.refreshToken.findUnique({ where: { tokenHash } });

      if (!stored) return null;

      // A spent token coming back means someone replayed it. Only this family
      // dies — other devices keep their sessions.
      if (stored.revokedAt) {
        await tx.refreshToken.updateMany({
          where: { familyId: stored.familyId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
        return null;
      }

      const now = new Date();
      if (stored.expiresAt <= now || stored.familyExpiresAt <= now) return null;

      await tx.refreshToken.update({
        where: { id: stored.id },
        data: { revokedAt: now },
      });

      const token = this.tokens.generateRefreshToken();

      await tx.refreshToken.create({
        data: {
          userId: stored.userId,
          // Inherited, never pushed forward: otherwise a session refreshed
          // every week would never end.
          familyId: stored.familyId,
          familyExpiresAt: stored.familyExpiresAt,
          tokenHash: this.tokens.hashRefreshToken(token),
          expiresAt: this.tokenExpiry(stored.familyExpiresAt),
        },
      });

      return { userId: stored.userId, token };
    });

    if (!rotated) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.users.findById(rotated.userId);

    if (!user) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return {
      user: toSessionUser(user),
      tokens: {
        accessToken: await this.tokens.signAccessToken(user.id),
        refreshToken: rotated.token,
      },
    };
  }

  /** Ends this session. Other devices are untouched. */
  async signOut(presented: string): Promise<void> {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: this.tokens.hashRefreshToken(presented) },
    });

    if (!stored) return;

    await this.prisma.refreshToken.updateMany({
      where: { familyId: stored.familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async startSession(
    userId: string,
    user: AuthResult['user'],
  ): Promise<AuthResult> {
    const token = this.tokens.generateRefreshToken();
    const familyExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        familyId: randomUUID(),
        familyExpiresAt,
        tokenHash: this.tokens.hashRefreshToken(token),
        expiresAt: this.tokenExpiry(familyExpiresAt),
      },
    });

    return {
      user,
      tokens: {
        accessToken: await this.tokens.signAccessToken(userId),
        refreshToken: token,
      },
    };
  }

  /** A token never outlives its family. */
  private tokenExpiry(familyExpiresAt: Date): Date {
    const own = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
    return own < familyExpiresAt ? own : familyExpiresAt;
  }
}
