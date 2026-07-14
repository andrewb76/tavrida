import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PlanConfigModule } from '../plan-config/plan-config.module';
import { MarketplaceClient } from './marketplace.client';
import { MarketplaceController } from './marketplace.controller';

@Module({
  imports: [AuthModule, PlanConfigModule],
  controllers: [MarketplaceController],
  providers: [MarketplaceClient],
  exports: [MarketplaceClient],
})
export class MarketplaceModule {}
