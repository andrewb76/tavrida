import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

export type AuctionStatus = 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'ENDED' | 'CANCELLED';
export type AuctionType = 'ENGLISH' | 'DUTCH';

@Entity({ schema: 'auction', name: 'auction' })
export class AuctionEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('varchar', { name: 'seller_id', length: 128 })
  sellerId!: string;

  @Column('uuid', { name: 'category_id', nullable: true })
  categoryId!: string | null;

  @Column('varchar', { length: 256 })
  title!: string;

  @Column('text', { default: '' })
  description!: string;

  @Column('varchar', { length: 16, default: 'ENGLISH' })
  type!: AuctionType;

  @Column('varchar', { length: 16, default: 'DRAFT' })
  status!: AuctionStatus;

  @Column('numeric', { name: 'starting_price', precision: 12, scale: 2, default: 0 })
  startingPrice!: string;

  @Column('numeric', { name: 'current_price', precision: 12, scale: 2, default: 0 })
  currentPrice!: string;

  @Column('numeric', { name: 'bid_increment', precision: 12, scale: 2, default: 100 })
  bidIncrement!: string;

  @Column('numeric', { name: 'reserve_price', precision: 12, scale: 2, nullable: true })
  reservePrice!: string | null;

  @Column('varchar', { length: 3, default: 'RUB' })
  currency!: string;

  @Column('timestamptz', { name: 'starts_at', nullable: true })
  startsAt!: Date | null;

  @Column('timestamptz', { name: 'ends_at', nullable: true })
  endsAt!: Date | null;

  @Column('varchar', { name: 'winner_id', length: 128, nullable: true })
  winnerId!: string | null;

  @Column('timestamptz', { name: 'promoted_until', nullable: true })
  promotedUntil!: Date | null;

  @Column('boolean', { name: 'has_expert_appraisal', default: false })
  hasExpertAppraisal!: boolean;

  @Column('int', { name: 'bid_count', default: 0 })
  bidCount!: number;

  @Column('jsonb', { default: () => "'[]'" })
  images!: string[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
