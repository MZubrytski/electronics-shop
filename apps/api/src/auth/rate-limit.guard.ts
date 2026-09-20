import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import { RateLimiterMemory } from 'rate-limiter-flexible';

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

  reset(): void {
    this.limiter = new RateLimiterMemory(LIMIT);
  }
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(private readonly limits: RateLimitService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    const route = `${context.getClass().name}.${context.getHandler().name}`;

    const key = `${route}:${this.clientAddress(request)}`;

    if (!(await this.limits.consume(key))) {
      throw new HttpException(
        'Too many attempts. Try again in a minute.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  private clientAddress(request: Request): string {
    const forwarded = request.header('x-client-address');
    const secret = process.env.INTERNAL_REQUEST_SECRET;

    if (forwarded && secret && request.header('x-internal-secret') === secret) {
      return forwarded;
    }

    return request.ip ?? 'unknown';
  }
}
