import { Module } from '@nestjs/common';
import { BillingClient } from './billing.client';

@Module({
  providers: [BillingClient],
  exports: [BillingClient],
})
export class BillingModule {}
