import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { Deal, DealStatus } from './entities/deal.entity';
import { User } from '../users/entities/user.entity';
import { ReputationHistory, ReputationChangeSource } from '../reputation/entities/reputation-history.entity';
import { ShipDealDto, LeaveReviewDto } from './dto/deal-actions.dto';
import { Auction } from '../auctions/entities/auction.entity';

@Injectable()
export class DealsService {
  constructor(private readonly dataSource: DataSource) {}
  
  async createDeal(auction: Auction, buyer: User, entityManager?: EntityManager): Promise<Deal> {
    const manager = entityManager || this.dataSource.manager;
    const deal = new Deal();
    deal.auction = auction;
    deal.buyer = buyer;
    deal.seller = auction.seller;
    deal.finalPrice = auction.currentPrice;
    deal.status = DealStatus.WAITING_FOR_PAYMENT;
    return await manager.save(deal);
  }

  /**
   * Шаг 1: Продавец подтверждает, что получил деньги напрямую на карту/счет
   */
  async confirmPayment(dealId: string, logtoUserId: string): Promise<Deal> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const deal = await queryRunner.manager.findOne(Deal, {
        where: { id: dealId },
        relations: ['seller'],
      });

      if (!deal) throw new NotFoundException('Сделка не найдена.');
      if (deal.seller.logtoId !== logtoUserId) throw new ForbiddenException('Только продавец лота может подтвердить оплату.');
      if (deal.status !== DealStatus.WAITING_FOR_PAYMENT) {
        throw new BadRequestException(`Нельзя подтвердить оплату для сделки в статусе ${deal.status}`);
      }

      deal.status = DealStatus.PAYMENT_CONFIRMED;
      deal.paymentConfirmedAt = new Date();

      const savedDeal = await queryRunner.manager.save(Deal, deal);
      await queryRunner.commitTransaction();
      return savedDeal;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Шаг 2: Продавец отправил монеты по почте и вводит трек-номер
   */
  async shipItem(dealId: string, dto: ShipDealDto, logtoUserId: string): Promise<Deal> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const deal = await queryRunner.manager.findOne(Deal, {
        where: { id: dealId },
        relations: ['seller'],
      });

      if (!deal) throw new NotFoundException('Сделка не найдена.');
      if (deal.seller.logtoId !== logtoUserId) throw new ForbiddenException('Только продавец лота может отправить товар.');
      if (deal.status !== DealStatus.PAYMENT_CONFIRMED) {
        throw new BadRequestException('Нельзя отправить товар, пока не подтверждена оплата.');
      }

      deal.status = DealStatus.SHIPPED;
      deal.trackingNumber = dto.trackingNumber;
      deal.shippedAt = new Date();

      const savedDeal = await queryRunner.manager.save(Deal, deal);
      await queryRunner.commitTransaction();
      return savedDeal;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Шаг 3: Покупатель подтверждает, что посылка пришла, монета проверена (Успешный финал сделки)
   */
  async confirmDelivery(dealId: string, logtoUserId: string): Promise<Deal> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const deal = await queryRunner.manager.findOne(Deal, {
        where: { id: dealId },
        relations: ['buyer'],
      });

      if (!deal) throw new NotFoundException('Сделка не найдена.');
      if (deal.buyer.logtoId !== logtoUserId) throw new ForbiddenException('Только покупатель может подтвердить получение посылки.');
      if (deal.status !== DealStatus.SHIPPED) {
        throw new BadRequestException('Нельзя подтвердить получение товара, который еще не был отправлен.');
      }

      deal.status = DealStatus.DELIVERED;
      deal.completedAt = new Date();

      const savedDeal = await queryRunner.manager.save(Deal, deal);
      await queryRunner.commitTransaction();
      return savedDeal;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Шаг 4: Оставление отзыва по закрытой сделке с изменением репутации
   */
  async leaveReview(dealId: string, dto: LeaveReviewDto, logtoUserId: string): Promise<ReputationHistory> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const deal = await queryRunner.manager.findOne(Deal, {
        where: { id: dealId },
        relations: ['buyer', 'seller'],
      });

      if (!deal) throw new NotFoundException('Сделка не найдена.');
      if (deal.status !== DealStatus.DELIVERED) {
        throw new BadRequestException('Вы можете оставить отзыв только после полного успешного завершения сделки.');
      }

      let targetUser: User; // Кому пишем отзыв

      if (deal.buyer.logtoId === logtoUserId) {
        targetUser = deal.seller; // Покупатель пишет отзыв продавцу
      } else if (deal.seller.logtoId === logtoUserId) {
        targetUser = deal.buyer; // Продавец пишет отзыв покупателю
      } else {
        throw new ForbiddenException('Вы не являетесь участником этой сделки.');
      }

      // Блокируем запись целевого юзера для безопасного изменения рейтинга
      const userToUpdate = await queryRunner.manager.findOne(User, {
        where: { id: targetUser.id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!userToUpdate) throw new NotFoundException('Целевой пользователь не найден.');

      // Проверяем, не оставлял ли уже этот юзер отзыв по этой сделке (Защита от дублей)
      const existingReview = await queryRunner.manager.findOne(ReputationHistory, {
        where: { deal: { id: dealId }, user: { id: userToUpdate.id } },
      });
      if (existingReview) throw new BadRequestException('Вы уже оставляли отзыв по этой сделке.');

      const scoreValue = dto.isPositive ? 1 : -1;

      // 1. Записываем транзакционный лог в историю репутации
      const repLog = new ReputationHistory();
      repLog.user = userToUpdate;
      repLog.deal = deal;
      repLog.value = scoreValue;
      repLog.source = ReputationChangeSource.DEAL_REVIEW;
      repLog.comment = dto.comment;
      const savedLog = await queryRunner.manager.save(ReputationHistory, repLog);

      // 2. Инкрементируем кэшированные счетчики в профиле юзера
      if (dto.isPositive) {
        userToUpdate.cachedRatingPositive += 1;
      } else {
        userToUpdate.cachedRatingNegative += 1;
      }
      await queryRunner.manager.save(User, userToUpdate);

      await queryRunner.commitTransaction();
      return savedLog;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
