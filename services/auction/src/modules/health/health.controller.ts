import {
  Controller,
  Get,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Controller('health')
export class HealthController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @Get()
  check() {
    return { status: 'ok', service: 'auction' };
  }

  @Get('ready')
  async ready() {
    try {
      await this.dataSource.query('SELECT 1');
      return { status: 'ready', service: 'auction', checks: { db: 'ok' } };
    } catch {
      throw new ServiceUnavailableException({
        status: 'not_ready',
        service: 'auction',
        checks: { db: 'down' },
      });
    }
  }
}
