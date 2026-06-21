import { Module, Global } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { MetricsController } from './metrics.controller';
import { BullModule } from '@nestjs/bullmq';

@Global()
@Module({  
  imports: [
    BullModule.registerQueue(
      { name: 'auction-tasks' },
      { name: 'autobid-tasks' },
    ),
  ],
  providers: [MetricsService],
  controllers: [MetricsController],
  exports: [MetricsService],
})
export class MetricsModule {}
