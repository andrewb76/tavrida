import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MediaModule } from '../media/media.module';
import { PlanConfigModule } from '../plan-config/plan-config.module';
import { AuctionClient } from './auction.client';
import { AuctionController } from './auction.controller';
import { AuctionPlanPolicyService } from './auction-plan-policy.service';

@Module({
  imports: [AuthModule, PlanConfigModule, MediaModule],
  controllers: [AuctionController],
  providers: [AuctionClient, AuctionPlanPolicyService],
})
export class AuctionModule {}
