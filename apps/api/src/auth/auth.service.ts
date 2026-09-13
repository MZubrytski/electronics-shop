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

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'P2002'
  );
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly passwords: PasswordService,
    private readonly tokens: TokensService,
  ) {}

  async signUp(input: SignUpInput): Promise<AuthResult> {
    const passwordHash = await this.passwords.hash(input.password);

    try {
      const user = await this.users.create({
        email: input.email,
        name: input.name,
        passwordHash,
      });

      return await this.startSession(user.id, toSessionUser(user));
    } catch (error) {
      // Let the unique index decide instead of checking first: a check
      // followed by a create loses the race between two simultaneous
      // sign-ups and turns the loser into a 500.
      if (isUniqueViolation(error)) {
        throw new ConflictException('This email is already registered');
      }
      throw error;
    }
  }

  async signIn(input: SignInInput): Promise<AuthResult> {
    const user = await this.users.findByEmail(input.email);

    // Same answer for an unknown address and a wrong password — and the same
    // amount of work. Skipping the hash when the address is unknown would
    // answer in a millisecond instead of ~50, and the difference alone tells
    // an attacker who is registered.
    const ok = await this.passwords.verify(
      user?.passwordHash ?? this.passwords.dummyHash,
      input.password,
    );

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

      // Conditional update, not a plain one: under READ COMMITTED two
      // concurrent refreshes both read revokedAt = null, and an unconditional
      // update would hand out two live tokens for the same family — exactly
      // the replay the check above is supposed to catch.
      const spent = await tx.refreshToken.updateMany({
        where: { id: stored.id, revokedAt: null },
        data: { revokedAt: now },
      });

      if (spent.count === 0) {
        // Someone else spent it between our read and our write: same meaning
        // as a replay.
        await tx.refreshToken.updateMany({
          where: { familyId: stored.familyId, revokedAt: null },
          data: { revokedAt: now },
        });
        return null;
      }

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
