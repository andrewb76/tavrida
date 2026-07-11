import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PlanConfigModule } from '../plan-config/plan-config.module';
import { ChargesController } from './charges.controller';

@Module({
  imports: [AuthModule, PlanConfigModule],
  controllers: [ChargesController],
})
export class ChargesModule {}
