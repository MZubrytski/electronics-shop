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

    // request.ip is only the real client once `trust proxy` is set in main.ts.
    // Without it every request behind the hosting proxy shares one address and
    // the limit locks out everybody at once.
    const key = `${request.method}:${request.path}:${request.ip ?? 'unknown'}`;

    if (!(await this.limits.consume(key))) {
      throw new HttpException(
        'Too many attempts. Try again in a minute.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
