import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

export type SubscriptionStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
export type BillingPeriod = 'monthly' | 'yearly';

@Entity({ name: 'user_subscription', schema: 'settings' })
export class UserSubscriptionEntity {
  @PrimaryColumn({ type: 'varchar', length: 128, name: 'user_id' })
  userId!: string;

  @Column({ type: 'varchar', length: 32, name: 'plan_id' })
  planId!: string;

  @Column({ type: 'timestamptz', name: 'starts_at' })
  startsAt!: Date;

  @Column({ type: 'timestamptz', name: 'expires_at', nullable: true })
  expiresAt!: Date | null;

  @Column({ type: 'boolean', name: 'auto_renew', default: false })
  autoRenew!: boolean;

  @Column({ type: 'varchar', length: 16, name: 'billing_period', nullable: true })
  billingPeriod!: BillingPeriod | null;

  @Column({ type: 'varchar', length: 16, default: 'ACTIVE' })
  status!: SubscriptionStatus;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
