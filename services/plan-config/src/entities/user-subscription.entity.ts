import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

export type SubscriptionStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED';

@Entity({ name: 'user_subscription', schema: 'plan_config' })
export class UserSubscriptionEntity {
  @PrimaryColumn('varchar', { name: 'user_id', length: 128 })
  userId!: string;

  @Column('varchar', { name: 'plan_id', length: 32, default: 'free' })
  planId!: string;

  @Column('timestamptz', { name: 'starts_at' })
  startsAt!: Date;

  @Column('timestamptz', { name: 'expires_at', nullable: true })
  expiresAt!: Date | null;

  @Column('boolean', { name: 'auto_renew', default: false })
  autoRenew!: boolean;

  /** Billing cycle used at last activate/renew; null → infer from dates. */
  @Column('varchar', { name: 'billing_period', length: 16, nullable: true })
  billingPeriod!: 'monthly' | 'yearly' | null;

  @Column('varchar', { length: 16, default: 'ACTIVE' })
  status!: SubscriptionStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
