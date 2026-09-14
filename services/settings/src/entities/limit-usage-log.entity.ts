import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'limit_usage_log', schema: 'settings' })
export class LimitUsageLogEntity {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @Column({ type: 'varchar', length: 128, name: 'param_key' })
  paramKey!: string;

  @Column({ type: 'varchar', length: 32, name: 'plan_id' })
  planId!: string;

  @Column({ type: 'varchar', length: 128, name: 'user_id' })
  userId!: string;

  @Column({ type: 'varchar', length: 8 })
  period!: string;

  @Column({ type: 'int' })
  delta!: number;

  @Column({ type: 'int', name: 'remaining_after' })
  remainingAfter!: number;

  @Column({ type: 'varchar', length: 16, default: 'base' })
  source!: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @Column({ type: 'jsonb', nullable: true })
  meta!: unknown;
}
