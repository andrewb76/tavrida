import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthCheckService, TypeOrmHealthIndicator, HealthCheck } from '@nestjs/terminus';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { errMsg } from 'src/common/helpers';

@ApiTags('Системные (Infrastructure)')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    // Внедряем нашу распределенную очередь, чтобы проверить живой ли коннект к Redis
    @InjectQueue('auction-tasks') private readonly redisQueue: Queue,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ 
    summary: 'Проверка здоровья инстанса (Healthcheck)', 
    description: 'Используется оркестраторами (Kubernetes/Swarm) для Liveness/Readiness пробок. Проверяет статус бэкенда, Postgres и Redis.' 
  })
  @ApiResponse({ status: 200, description: 'Все системы работают штатно.' })
  @ApiResponse({ status: 503, description: 'Критический сбой одной из систем (БД или Redis недоступны).' })
  async check() {
    return this.health.check([
      // 1. Проверяем пинг к PostgreSQL
      () => this.db.pingCheck('database', { timeout: 3000 }),
      
      // 2. Кастомный пинг к Redis через проверку состояния клиента BullMQ
      async () => {
        try {
          const client = await this.redisQueue.client;
          const status = await (client as any).ping();
          return {
            redis: {
              status: status === 'PONG' ? 'up' : 'down',
            },
          };
        } catch (err) {
          return {
            redis: {
              status: 'down',
              message: errMsg(err),
            },
          };
        }
      },
    ]);
  }
}
