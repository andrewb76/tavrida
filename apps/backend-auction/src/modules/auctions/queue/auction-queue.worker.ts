import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { Auction, AuctionStatus, AuctionType } from '../entities/auction.entity';
import { AuctionStrategyFactory } from '../strategies/auction-strategy.factory';

@Processor('auction-tasks') // Слушаем таски строго из этой очереди
export class AuctionQueueWorker extends WorkerHost {
  private readonly logger = new Logger(AuctionQueueWorker.name);

  constructor(
    @InjectRepository(Auction)
    private readonly auctionRepository: Repository<Auction>,
    private readonly strategyFactory: AuctionStrategyFactory,
  ) {
    super();
  }

  /**
   * Сюда прилетают задачи из Redis. Метод гарантированно выполняется 
   * только на одном из запущенных инстансов сервера.
   */
  async process(job: Job<any, any, string>): Promise<any> {
    if (job.name !== 'cron-tick') return;

    this.logger.log(`[Job ${job.id}] Инстанс принял задачу на пересчет цен аукционов...`);
    const now = new Date();

    // 1. Активация отложенных лотов (PENDING -> ACTIVE)
    const pendingAuctions = await this.auctionRepository.find({
      where: {
        status: AuctionStatus.PENDING,
        startTime: LessThanOrEqual(now),
      },
    });

    for (const auction of pendingAuctions) {
      auction.status = AuctionStatus.ACTIVE;
      await this.auctionRepository.save(auction);
      this.logger.log(`Лот "${auction.title}" переведен в статус ACTIVE.`);
    }

    // 2. Пересчет цен Голландских аукционов
    const activeDutchAuctions = await this.auctionRepository.find({
      where: {
        status: AuctionStatus.ACTIVE,
        type: AuctionType.DUTCH,
      },
    });

    if (activeDutchAuctions.length > 0) {
      const dutchStrategy = this.strategyFactory.getStrategy(AuctionType.DUTCH);

      for (const auction of activeDutchAuctions) {
        const oldPrice = Number(auction.currentPrice);
        const oldStatus = auction.status;

        await dutchStrategy.handleTick!(auction);

        if (Number(auction.currentPrice) !== oldPrice || auction.status !== oldStatus) {
          await this.auctionRepository.save(auction);
          
          this.logger.log(
            `Голландский лот "${auction.title}": цена снижена до ${Number(auction.currentPrice).toFixed(2)}`
          );
        }
      }
    }

    this.logger.log(`[Job ${job.id}] Задача успешно обработана.`);
  }
}
