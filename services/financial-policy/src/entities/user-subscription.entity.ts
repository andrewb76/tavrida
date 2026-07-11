import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

export type SubscriptionStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED';

@Entity({ name: 'user_subscription', schema: 'financial_policy' })
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

  @Column('varchar', { length: 16, default: 'ACTIVE' })
  status!: SubscriptionStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
