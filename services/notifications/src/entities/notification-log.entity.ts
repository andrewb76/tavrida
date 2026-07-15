import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

export type NotificationChannel = 'email' | 'push' | 'in_app' | 'unknown';
export type NotificationStatus = 'pending' | 'sent' | 'failed' | 'delivered';

@Entity({ schema: 'notifications', name: 'notification_log' })
export class NotificationLogEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('varchar', { name: 'user_id', length: 128 })
  userId!: string;

  @Column('varchar', { name: 'workflow_id', length: 128 })
  workflowId!: string;

  @Column('varchar', { name: 'transaction_id', length: 128 })
  transactionId!: string;

  @Column('varchar', { length: 32, default: 'unknown' })
  channel!: NotificationChannel;

  @Column('varchar', { length: 32, default: 'pending' })
  status!: NotificationStatus;

  @Column('jsonb', { nullable: true })
  payload!: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
