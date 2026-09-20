import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { RateLimitService } from './rate-limit.service.js';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly limits: RateLimitService,
    private readonly config: ConfigService,
  ) {}

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
    const secret = this.config.get<string>('INTERNAL_REQUEST_SECRET');

    if (forwarded && secret && request.header('x-internal-secret') === secret) {
      return forwarded;
    }

    return request.ip ?? 'unknown';
  }
}
