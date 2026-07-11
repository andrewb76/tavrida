import { Module } from '@nestjs/common';
import { PlanConfigClient } from './plan-config.client';

@Module({
  providers: [PlanConfigClient],
  exports: [PlanConfigClient],
})
export class PlanConfigModule {}
