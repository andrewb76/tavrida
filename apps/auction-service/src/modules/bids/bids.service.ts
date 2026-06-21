import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { PlaceBidDto } from './dto/place-bid.dto';
import { Bid } from './entities/bid.entity';
import { Auction, AuctionStatus } from '../auctions/entities/auction.entity';
import { User } from '../users/entities/user.entity';
import { AuctionStrategyFactory } from '../auctions/strategies/auction-strategy.factory';
import { AutobidQueueProducer } from './queue/autobid-queue.producer';
import { DealsService } from '../deals/deals.service';
import { MetricsService } from '../metrics/metrics.service';

@Injectable()
export class BidsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly strategyFactory: AuctionStrategyFactory, 
    private readonly autobidQueueProducer: AutobidQueueProducer,
    private readonly dealsService: DealsService,
    private readonly metrics: MetricsService,
  ) {}

  async placeBid(placeBidDto: PlaceBidDto, logtoUserId: string): Promise<Bid> {
    const { auctionId, amount } = placeBidDto;

    // 1. Инициализируем QueryRunner для полного контроля над транзакцией
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 2. Ищем пользователя, который делает ставку
      const user = await queryRunner.manager.findOne(User, {
        where: { logtoId: logtoUserId },
      });
      if (!user) {
        throw new NotFoundException('Пользователь не найден в системе.');
      }

      // Проверка на бан
      if (user.bannedUntil && user.bannedUntil > new Date()) {
        throw new BadRequestException(`Вы забанены до ${user.bannedUntil}. Причина: ${user.banReason}`);
      }

      // 3. БЛОКИРОВКА СТРОКИ (Pessimistic Write Lock). 
      // Любой параллельный запрос на ставку для ЭТОГО ЖЕ auctionId встанет в очередь в Postgres
      const auction = await queryRunner.manager.findOne(Auction, {
        where: { id: auctionId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!auction) {
        throw new NotFoundException('Данный аукцион не найден.');
      }

      // Базовая валидация статуса и создателя лота
      if (auction.status !== AuctionStatus.ACTIVE) {
        throw new BadRequestException('Ставки принимаются только в активных аукционах.');
      }

      if (auction.seller.id === user.id) {
        throw new BadRequestException('Вы не можете делать ставки на собственный лот.');
      }

      if (new Date() > auction.endTime) {
        throw new BadRequestException('Время проведения этого аукциона уже истекло.');
      }

      // 4. ДИНАМИЧЕСКИЙ ВЫЗОВ СТРАТЕГИИ (Паттерн Стратегия)
      // Из фабрики забирается нужная математическая модель (English, Dutch и т.д.)
      const strategy = this.strategyFactory.getStrategy(auction.type);

      // Передаем контекст в стратегию для валидации специфичных правил (шаг, резерв и т.д.)
      const isValid = await strategy.validateBid(auction, amount, user.id);
      if (!isValid) {
        throw new BadRequestException('Ставка не удовлетворяет правилам данного типа аукциона.');
      }

      // 5. Создаем сущность ставки в рамках транзакции
      const bid = new Bid();
      bid.auction = auction;
      bid.user = user;
      bid.amount = amount;
      
      const savedBid = await queryRunner.manager.save(Bid, bid);

      // 6. Стратегия модифицирует аукцион (например, пересчитывает цену или двигает Анти-снайпер)
      const updatedAuction = await strategy.processBid(auction, savedBid);
      await queryRunner.manager.save(Auction, updatedAuction);

      if (updatedAuction.status === AuctionStatus.FINISHED) {
        await this.dealsService.createDeal(updatedAuction, user, queryRunner.manager);
      }

      // Если всё ок — фиксируем изменения в Postgres
      await queryRunner.commitTransaction();
      this.metrics.incrementBid(savedBid.isSubscribedToAutoBid);

      await this.autobidQueueProducer.scheduleAutobidCheck(auctionId);
      // TODO: Здесь будет вызов Redis Pub/Sub для отправки веб-сокета на фронтенд (в PrimeVue и D3)
      
      return savedBid;
    } catch (err) {
      // При любой ошибке откатываем транзакцию, снимая пессимистическую блокировку
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      // Обязательно освобождаем коннект обратно в пул соединений
      await queryRunner.release();
    }
  }
}
