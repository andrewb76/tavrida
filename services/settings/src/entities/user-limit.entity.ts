import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'user_limit', schema: 'settings' })
export class UserLimitEntity {
  @PrimaryColumn({ type: 'varchar', length: 128, name: 'param_key' })
  paramKey!: string;

  @PrimaryColumn({ type: 'varchar', length: 32, name: 'plan_id' })
  planId!: string;

  @PrimaryColumn({ type: 'varchar', length: 128, name: 'user_id' })
  userId!: string;

  @PrimaryColumn({ type: 'varchar', length: 8 })
  period!: string;

  @Column({ type: 'int', name: 'max_value' })
  maxValue!: number;

  @Column({ type: 'int' })
  remaining!: number;

  @Column({ type: 'timestamptz', name: 'cycle_start' })
  cycleStart!: Date;

  @Column({ type: 'timestamptz', name: 'cycle_end' })
  cycleEnd!: Date;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
