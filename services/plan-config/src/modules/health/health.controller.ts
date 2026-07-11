import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { status: 'ok', service: 'plan-config' };
  }

  @Get('ready')
  ready() {
    return { status: 'ready', service: 'plan-config' };
  }
}
