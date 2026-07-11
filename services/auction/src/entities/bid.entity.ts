import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
} from 'typeorm';

@Entity({ schema: 'auction', name: 'bid' })
export class BidEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('uuid', { name: 'auction_id' })
  auctionId!: string;

  @Column('varchar', { name: 'bidder_id', length: 128 })
  bidderId!: string;

  @Column('numeric', { precision: 12, scale: 2 })
  amount!: string;

  @Column('varchar', { length: 3, default: 'RUB' })
  currency!: string;

  @CreateDateColumn({ name: 'placed_at', type: 'timestamptz' })
  placedAt!: Date;

  @Column('boolean', { name: 'is_winning', default: false })
  isWinning!: boolean;
}
