import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, Index } from 'typeorm';
import { Auction } from './auction.entity';
import { User } from '../../users/entities/user.entity';

@Entity('auto_bids')
// Индекс для мгновенного поиска самого высокого скрытого лимита по конкретному лоту
@Index(['auction', 'maxAmount']) 
export class AutoBid {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Auction, { onDelete: 'CASCADE' })
  auction: Auction;

  @ManyToOne(() => User, { eager: true })
  user: User;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  maxAmount: number; // Скрытый потолок цены коллекционера

  @CreateDateColumn()
  createdAt: Date;
}
