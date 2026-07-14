import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type DealType = 'auction' | 'marketplace';

@Entity({ name: 'deal_feedback', schema: 'deal_feedback' })
@Index('idx_deal_feedback_order', ['orderId'])
@Index('idx_deal_feedback_auction', ['auctionId'])
export class DealFeedbackEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 16 })
  dealType!: DealType;

  @Column({ type: 'uuid', nullable: true })
  auctionId!: string | null;

  @Column({ type: 'uuid', nullable: true })
  orderId!: string | null;

  @Column({ type: 'varchar', length: 128 })
  sellerId!: string;

  @Column({ type: 'varchar', length: 128 })
  buyerId!: string;

  @Column({ type: 'numeric', precision: 2, scale: 0, nullable: true })
  sellerRating!: string | null;

  @Column({ type: 'numeric', precision: 2, scale: 0, nullable: true })
  buyerRating!: string | null;

  @Column({ type: 'text', nullable: true })
  sellerComment!: string | null;

  @Column({ type: 'text', nullable: true })
  buyerComment!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  submittedBySellerAt!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  submittedByBuyerAt!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  finalisedAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
