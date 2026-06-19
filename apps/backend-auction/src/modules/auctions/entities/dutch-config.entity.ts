import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { Auction } from './auction.entity';

@Entity('dutch_auction_configs')
export class DutchAuctionConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => Auction, { onDelete: 'CASCADE' })
  @JoinColumn()
  auction: Auction;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  startPrice: number;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  floorPrice: number; // Минимальная цена, ниже которой опускаться нельзя

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  decreaseStep: number; // Размер шага снижения цены

  @Column({ type: 'int', default: 10 })
  decreaseIntervalMinutes: number; // Как часто падает цена (в минутах)
}
