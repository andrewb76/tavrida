import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BillingModule } from '../billing/billing.module';
import { WalletsController } from './wallets.controller';

@Module({
  imports: [AuthModule, BillingModule],
  controllers: [WalletsController],
})
export class WalletsModule {}
