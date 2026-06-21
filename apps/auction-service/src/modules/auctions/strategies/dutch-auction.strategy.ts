import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm'; // или из typeorm напрямую
import { Repository } from 'typeorm';
import { AuctionStrategy } from './auction-strategy.interface';
import { Auction, AuctionStatus } from '../entities/auction.entity';
import { DutchAuctionConfig } from '../entities/dutch-config.entity';
import { Bid } from '../../bids/entities/bid.entity';
import { MetricsService } from 'src/modules/metrics/metrics.service';

@Injectable()
export class DutchAuctionStrategy implements AuctionStrategy {
  constructor(
    @InjectRepository(DutchAuctionConfig)
    private readonly configRepository: Repository<DutchAuctionConfig>,
    private readonly metrics: MetricsService,
  ) {}

  async validateBid(auction: Auction, amount: number, userId: string): Promise<boolean> {
    const currentPrice = Number(auction.currentPrice);

    // В голландском аукционе ставка должна строго соответствовать текущей цене выкупа
    if (Math.abs(amount - currentPrice) > 0.01) {
      throw new BadRequestException(
        `Некорректная цена выкупа. Актуальная цена лота на данный момент: ${currentPrice.toFixed(2)}`
      );
    }

    return true;
  }

  async processBid(auction: Auction, bid: Bid): Promise<Auction> {
    // Первая же успешная ставка на голландском аукционе означает полную победу и закрытие торгов
    auction.status = AuctionStatus.FINISHED;
    // Фиксируем финальную цену продажи равной ставке выкупа
    auction.currentPrice = bid.amount;
    return auction;
  }

  /**
   * Метод пересчета цены по таймеру (вызывается планировщиком Cron раз в минуту)
   */
  async handleTick(auction: Auction): Promise<void> {
    const config = await this.configRepository.findOne({ where: { auction: auction } });
    if (!config || auction.status !== AuctionStatus.ACTIVE) return;

    const now = new Date();
    const startTime = new Date(auction.startTime);

    // Считаем сколько минут лот находится на торгах
    const elapsedMinutes = Math.floor((now.getTime() - startTime.getTime()) / 60000);
    if (elapsedMinutes <= 0) return;

    // Считаем сколько полных интервалов снижения прошло
    const stepsPassed = Math.floor(elapsedMinutes / config.decreaseIntervalMinutes);
    if (stepsPassed <= 0) return;

    const startPrice = Number(config.startPrice);
    const decreaseStep = Number(config.decreaseStep);
    const floorPrice = Number(config.floorPrice);

    // Математический расчет новой цены: Стартовая - (Шаги * Размер_шага)
    let newPrice = startPrice - (stepsPassed * decreaseStep);
    
    
    // Цена не может упасть ниже лимита (floorPrice), установленного продавцом
    if (newPrice < floorPrice) {
      newPrice = floorPrice;
    }
    
    // Если цена изменилась — обновляем её в лоте
    if (Number(auction.currentPrice) !== newPrice) {
      auction.currentPrice = newPrice;
      
      this.metrics.incrementPriceDrop();
      
      // Если время аукциона истекло или цена достигла дна и лот долго не покупают,
      // мы можем программно закрыть его, проверив endTime
      if (now > auction.endTime) {
        auction.status = AuctionStatus.FINISHED;
      }
    }
  }
}
