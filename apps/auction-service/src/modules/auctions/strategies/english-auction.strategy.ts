import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuctionStrategy } from './auction-strategy.interface';
import { Auction, AuctionStatus } from '../entities/auction.entity';
import { EnglishAuctionConfig } from '../entities/english-config.entity';
import { Bid } from '../../bids/entities/bid.entity';
import { MetricsService } from 'src/modules/metrics/metrics.service';

@Injectable()
export class EnglishAuctionStrategy implements AuctionStrategy {
  constructor(
    @InjectRepository(EnglishAuctionConfig)
    private readonly configRepository: Repository<EnglishAuctionConfig>,
    private readonly metrics: MetricsService,
  ) {}

  async validateBid(auction: Auction, amount: number, userId: string): Promise<boolean> {
    // 1. Получаем конфигурацию английских торгов для этого лота
    const config = await this.configRepository.findOne({ where: { auction: auction } });
    if (!config) {
      throw new BadRequestException('Конфигурация английского аукциона не найдена.');
    }

    const currentPrice = Number(auction.currentPrice);
    const minStep = Number(config.minStep);

    // 2. Проверка первой ставки vs последующих
    // Если ставок еще не было, цена равна стартовой, и ее можно перебить начальной суммой.
    // Если ставки были — новая должна быть строго больше текущей цены + минимальный шаг.
    if (currentPrice > Number(config.startPrice)) {
      if (amount < currentPrice + minStep) {
        throw new BadRequestException(
          `Ставка слишком мала. Минимально допустимая сумма: ${(currentPrice + minStep).toFixed(2)}`
        );
      }
    } else {
      if (amount < Number(config.startPrice)) {
        throw new BadRequestException(`Ставка не может быть ниже стартовой цены: ${config.startPrice}`);
      }
    }

    return true;
  }

  async processBid(auction: Auction, bid: Bid): Promise<Auction> {
    // 1. Обновляем текущую стоимость лота значением новой ставки
    auction.currentPrice = bid.amount;

    // 2. Загружаем конфиг для проверки анти-снайпера
    const config = await this.configRepository.findOne({ where: { auction: auction } });
    
    if (!config) return auction;

    // 3. Логика МЕХАНИЗМА АНТИ-СНАЙПЕРА
    const now = new Date();
    const endTime = new Date(auction.endTime);
    
    // Вычисляем, сколько миллисекунд осталось до конца аукциона
    const msLeft = endTime.getTime() - now.getTime();
    const antiSniperMs = config.antiSniperSeconds * 1000;

    // Если ставка сделана в "зоне анти-снайпера" (например, менее чем за 3 минуты до конца)
    if (msLeft > 0 && msLeft <= antiSniperMs) {
      // Продлеваем аукцион ровно на заданное количество секунд от текущего момента
      auction.endTime = new Date(now.getTime() + antiSniperMs);
    }

    // 4. Проверяем цену моментального выкупа (Блиц)
    if (config.buyNowPrice && bid.amount >= Number(config.buyNowPrice)) {
      auction.status = AuctionStatus.FINISHED;
      // Здесь в реальном сервисе сработает триггер на создание сущности Deal (Сделка)
    }

    if (auction.status === AuctionStatus.FINISHED) {
      const result = config.buyNowPrice && bid.amount >= Number(config.buyNowPrice) ? 'buynow' : 'sold';
      this.metrics.incrementAuctionFinished(result, Number(auction.currentPrice));
    }

    return auction;
  }
}
