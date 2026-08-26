import { Controller, Get } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

@Controller('health')
export class HealthController {
  constructor(private readonly redis: RedisService) {}

  @Get()
  live() {
    return { status: 'ok', service: 'presence' };
  }

  @Get('ready')
  async ready() {
    await this.redis.ping();
    return { status: 'ready', service: 'presence' };
  }
}
