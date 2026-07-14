import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  live() {
    return { status: 'ok', service: 'marketplace' };
  }

  @Get('ready')
  ready() {
    return { status: 'ready', service: 'marketplace' };
  }
}
