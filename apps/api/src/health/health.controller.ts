import { Controller, Get } from '@nestjs/common';
import { HealthResponse } from '@shop/contracts';

@Controller('health')
export class HealthController {
  @Get()
  check(): HealthResponse {
    return { status: 'ok', service: '@shop/api' };
  }
}
