import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { DealType } from './deal-feedback.entity';

@Entity({ name: 'pending_deal_feedback', schema: 'deal_feedback' })
@Index('idx_pending_user', ['userId'])
export class PendingDealFeedbackEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 16 })
  dealType!: DealType;

  @Column({ type: 'uuid', nullable: true })
  auctionId!: string | null;

  @Column({ type: 'uuid', nullable: true })
  orderId!: string | null;

  @Column({ type: 'varchar', length: 128 })
  userId!: string;

  @Column({ type: 'timestamptz', nullable: true })
  notificationSentAt!: Date | null;

  @Column({ type: 'int', default: 0 })
  remindersCount!: number;

  @Column({ type: 'timestamptz', nullable: true })
  lastReminderAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
