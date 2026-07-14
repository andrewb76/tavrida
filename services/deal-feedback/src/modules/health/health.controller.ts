import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  live() {
    return { status: 'ok', service: 'deal-feedback' };
  }

  @Get('ready')
  ready() {
    return { status: 'ready', service: 'deal-feedback' };
  }
}
