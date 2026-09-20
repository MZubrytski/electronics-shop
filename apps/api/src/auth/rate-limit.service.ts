import { Injectable } from '@nestjs/common';
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
