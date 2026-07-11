import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { status: 'ok', service: 'financial-policy' };
  }

  @Get('ready')
  ready() {
    return { status: 'ready', service: 'financial-policy' };
  }
}
