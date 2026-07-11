import { Module } from '@nestjs/common';
import { FinancialPolicyClient } from './financial-policy.client';

@Module({
  providers: [FinancialPolicyClient],
  exports: [FinancialPolicyClient],
})
export class FinancialPolicyModule {}
