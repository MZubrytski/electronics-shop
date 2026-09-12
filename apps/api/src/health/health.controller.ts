import { Controller, Get } from '@nestjs/common';
import { HealthResponse } from '@shop/contracts';

@Controller('health')
export class HealthController {
  // Render polls this endpoint to decide whether the instance is alive,
  // so it stays public and free of any database round trip.
  @Get()
  check(): HealthResponse {
    return { status: 'ok', service: '@shop/api' };
  }
}
