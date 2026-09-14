import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { status: 'ok', service: 'settings' };
  }

  @Get('ready')
  ready() {
    return { status: 'ready', service: 'settings' };
  }
}
