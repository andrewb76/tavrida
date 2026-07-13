import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { SourceDomain, TargetType } from '../common/subscription.types';

@Entity({ name: 'subscription', schema: 'subscriptions' })
@Index('uq_subscription_user_target', ['userId', 'sourceDomain', 'targetType', 'targetId'], {
  unique: true,
})
export class SubscriptionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar', length: 32 })
  sourceDomain!: SourceDomain;

  @Column({ type: 'varchar', length: 64 })
  targetType!: TargetType;

  @Column({ type: 'uuid', nullable: true })
  targetId!: string | null;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  options!: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
