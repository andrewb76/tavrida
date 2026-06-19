import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BidsController } from './bids.controller';
import { BidsService } from './bids.service';
import { Bid } from './entities/bid.entity';
import { User } from '../users/entities/user.entity';
import { AuctionsModule } from '../auctions/auctions.module';
import { BullModule } from '@nestjs/bullmq';
import { AutobidQueueWorker } from './queue/autobid-queue.worker';
import { InfrastructureModule } from 'src/common/infrastructure.module';
import { InfisicalService } from 'src/common/infisical.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Bid, User]),
    AuctionsModule,
    BullModule.registerQueueAsync({
      name: 'autobid-tasks',
      imports: [InfrastructureModule],
      inject: [InfisicalService],
      useFactory: (infisical: InfisicalService) => ({
        connection: {
          host: infisical.get('REDIS_HOST') || 'localhost',
          port: parseInt(infisical.get('REDIS_PORT'), 10) || 6379,
          password: infisical.get('REDIS_PASSWORD') || undefined,
        },
      }),
    }),
  ],
  controllers: [BidsController],
  providers: [BidsService, AutobidQueueWorker],
  exports: [BidsService, BullModule],
})
export class BidsModule {}
