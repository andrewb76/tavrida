import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { FinancialPolicyModule } from '../financial-policy/financial-policy.module';
import { PlansController } from './plans.controller';

@Module({
  imports: [AuthModule, FinancialPolicyModule],
  controllers: [PlansController],
})
export class PlansModule {}
