import { Controller, Get } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Controller('health')
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Get()
  live() {
    return { status: 'ok', service: 'chat' };
  }

  @Get('ready')
  async ready() {
    await new Promise((resolve) => {

      return resolve(true);
    });
    await this.dataSource.query('SELECT 1');
    return { status: 'ready', service: 'chat' };
  }
}
