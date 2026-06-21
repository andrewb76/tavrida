import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { Auction } from './auction.entity';

@Entity('english_auction_configs')
export class EnglishAuctionConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => Auction, { onDelete: 'CASCADE' })
  @JoinColumn()
  auction: Auction;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  startPrice: number;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  minStep: number; // Минимальный шаг повышения цены

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  reservePrice: number; // Скрытая резервная цена продавца

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  buyNowPrice: number; // Цена Блиц (моментальный выкуп)

  @Column({ default: 180 })
  antiSniperSeconds: number; // На сколько секунд продлевать (180 сек = 3 минуты)
}
