import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, Index } from 'typeorm';
import { Auction } from '../../auctions/entities/auction.entity';
import { User } from '../../users/entities/user.entity';

@Entity('bids')
@Index(['auction', 'createdAt']) // Индекс для быстрого поиска последней ставки по лоту
export class Bid {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Auction, { onDelete: 'CASCADE' })
  auction: Auction;

  @ManyToOne(() => User, { eager: true })
  user: User; // Кто сделал ставку

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount: number;

  @Column({ default: false })
  isSubscribedToAutoBid: boolean; // Ставка сделана роботом или вручную

  @CreateDateColumn()
  createdAt: Date;
}
