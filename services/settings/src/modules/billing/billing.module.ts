import { Module } from '@nestjs/common';
import { BillingClient } from './billing-client.service';

@Module({
  providers: [BillingClient],
  exports: [BillingClient],
})
export class BillingModule {}
