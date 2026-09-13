import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import { RateLimiterMemory } from 'rate-limiter-flexible';

/**
 * Ten attempts a minute per address, per endpoint.
 *
 * Per endpoint on purpose: signing up should not eat the budget for signing
 * in. Counting is in process memory, which is enough for a single instance;
 * a second one would need shared storage, and that is its own task.
 */
const LIMIT = { points: 10, duration: 60 } as const;

@Injectable()
export class RateLimitService {
  private limiter = new RateLimiterMemory(LIMIT);

  async consume(key: string): Promise<boolean> {
    try {
      await this.limiter.consume(key);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Tests share one process, so the budget would leak from one case into the
   * next. Replacing the limiter beats reaching into its internals.
   */
  reset(): void {
    this.limiter = new RateLimiterMemory(LIMIT);
  }
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(private readonly limits: RateLimitService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    // Keyed by the handler, never by the requested path. Express matches
    // routes case-insensitively and tolerates a trailing slash, so a budget
    // keyed by `request.path` would hand out a fresh ten attempts for every
    // spelling of the same endpoint — thousands of tries a minute.
    const route = `${context.getClass().name}.${context.getHandler().name}`;

    // request.ip is the real client only where `trust proxy` is enabled and a
    // proxy actually sits in front. See the note in main.ts.
    const key = `${route}:${this.clientAddress(request)}`;

    if (!(await this.limits.consume(key))) {
      throw new HttpException(
        'Too many attempts. Try again in a minute.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  /**
   * The storefront forwards the visitor's address, because in production the
   * browser never reaches this API directly: every sign-in arrives from the
   * storefront's own egress address, and keying on that would put the whole
   * shop on a single ten-attempt budget.
   *
   * Trusted only when the caller proved it is the storefront.
   */
  private clientAddress(request: Request): string {
    const forwarded = request.header('x-client-address');
    const secret = process.env.INTERNAL_REQUEST_SECRET;

    if (forwarded && secret && request.header('x-internal-secret') === secret) {
      return forwarded;
    }

    return request.ip ?? 'unknown';
  }
}
