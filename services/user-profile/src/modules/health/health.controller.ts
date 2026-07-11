import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { status: 'ok', service: 'user-profile' };
  }

  @Get('ready')
  ready() {
    return { status: 'ready', service: 'user-profile' };
  }
}
