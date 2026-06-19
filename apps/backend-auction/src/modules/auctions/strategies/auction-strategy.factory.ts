import { Injectable, BadRequestException, OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { AuctionStrategy } from './auction-strategy.interface';
import { AuctionType } from '../entities/auction.entity';
import { EnglishAuctionStrategy } from './english-auction.strategy';
import { DutchAuctionStrategy } from './dutch-auction.strategy'; // импорт

@Injectable()
export class AuctionStrategyFactory implements OnModuleInit {
  private strategies: Map<AuctionType, AuctionStrategy> = new Map();

  constructor(private readonly moduleRef: ModuleRef) {}

  onModuleInit() {
    const englishStrategy = this.moduleRef.get(EnglishAuctionStrategy, { strict: false });
    const dutchStrategy = this.moduleRef.get(DutchAuctionStrategy, { strict: false }); // вытаскиваем инстанс
    
    this.strategies.set(AuctionType.ENGLISH, englishStrategy);
    this.strategies.set(AuctionType.DUTCH, dutchStrategy); // привязываем к типу
  }

  public getStrategy(type: AuctionType): AuctionStrategy {
    const strategy = this.strategies.get(type);
    if (!strategy) {
      throw new BadRequestException(`Логика для типа торгов "${type}" не реализована.`);
    }
    return strategy;
  }
}
