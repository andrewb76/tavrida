import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuctionsController } from './auctions.controller';
import { AuctionsService } from './auctions.service';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { BullModule } from '@nestjs/bullmq'; 
import { Auction } from './entities/auction.entity';
import { Category } from './entities/category.entity';
import { EnglishAuctionConfig } from './entities/english-config.entity';
import { EnglishAuctionStrategy } from './strategies/english-auction.strategy';
import { AuctionStrategyFactory } from './strategies/auction-strategy.factory';
import { DutchAuctionConfig } from './entities/dutch-config.entity';
import { DutchAuctionStrategy } from './strategies/dutch-auction.strategy';
import { AutoBid } from './entities/autobid.entity';
import { InfrastructureModule } from 'src/common/infrastructure.module';
import { InfisicalService } from 'src/common/infisical.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Auction,
      Category,
      EnglishAuctionConfig,
      DutchAuctionConfig,
      AutoBid,
    ]),    
    BullModule.registerQueueAsync({
      name: 'auction-tasks',
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
  controllers: [
    AuctionsController, 
    CategoriesController
  ],
  providers: [
    AuctionsService, 
    CategoriesService,
    AuctionStrategyFactory,
    EnglishAuctionStrategy,
    DutchAuctionStrategy,
  ],
  // Экспортируем фабрику и стратегии, чтобы BidsModule мог получить к ним доступ
  exports: [
    AuctionStrategyFactory, 
    EnglishAuctionStrategy,
    DutchAuctionStrategy,
    TypeOrmModule // экспортируем, чтобы другие модули видели репозитории
  ],
})
export class AuctionsModule {}
