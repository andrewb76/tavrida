import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { BullModule } from '@nestjs/bullmq';
import { HealthController } from './health.controller';

@Module({
  imports: [
    TerminusModule,
    // Регистрируем доступ к очереди, чтобы контроллер мог достучаться до Redis-клиента
    BullModule.registerQueue({
      name: 'auction-tasks',
    }),
  ],
  controllers: [HealthController],
})
export class HealthModule {}
