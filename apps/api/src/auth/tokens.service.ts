import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHmac, randomBytes } from 'node:crypto';

export const ACCESS_TOKEN_TTL = '15m';
export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** The only thing an access token carries. */
export interface AccessPayload {
  sub: string;
}

@Injectable()
export class TokensService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Access tokens hold the subject and nothing else.
   *
   * Not the role: the guard reads the person from the database anyway, so
   * copying the role into the token would buy nothing and would let a demotion
   * stay unnoticed until the token expired.
   */
  signAccessToken(userId: string): Promise<string> {
    return this.jwt.signAsync({ sub: userId } satisfies AccessPayload, {
      secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: ACCESS_TOKEN_TTL,
    });
  }

  verifyAccessToken(token: string): Promise<AccessPayload> {
    return this.jwt.verifyAsync<AccessPayload>(token, {
      secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  /** 256 bits of randomness: nothing to guess, nothing to forge. */
  generateRefreshToken(): string {
    return randomBytes(32).toString('base64url');
  }

  /**
   * Keyed hash, not argon2.
   *
   * The token is random, so slowing an attacker down buys nothing, while a
   * salted hash would make the row impossible to find by the token. HMAC is
   * deterministic — so it doubles as the lookup key — and the secret acts as
   * a pepper, so a leaked database alone does not match tokens to rows.
   */
  hashRefreshToken(token: string): string {
    return createHmac(
      'sha256',
      this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
    )
      .update(token)
      .digest('base64url');
  }
}
