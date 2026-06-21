import { Auction } from '../entities/auction.entity';
import { Bid } from '../../bids/entities/bid.entity';

export interface AuctionStrategy {
  /**
   * Проверка: может ли быть принята ставка по правилам данного типа аукциона.
   * Проверяет шаги цены, закрытые торги, права участников.
   */
  validateBid(auction: Auction, amount: number, userId: string): Promise<boolean>;

  /**
   * Обработка ставки: пересчет текущей цены, применение анти-снайпера, 
   * обновление времени окончания торгов (endTime).
   */
  processBid(auction: Auction, bid: Bid): Promise<Auction>;

  /**
   * Опциональный метод для крон-задач (тики времени).
   * Используется для голландского аукциона (планомерное снижение цены).
   */
  handleTick?(auction: Auction): Promise<void>;
}

