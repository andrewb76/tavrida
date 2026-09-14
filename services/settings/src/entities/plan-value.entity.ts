import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'plan_value', schema: 'settings' })
export class PlanValueEntity {
  @PrimaryColumn({ type: 'varchar', length: 32, name: 'plan_id' })
  planId!: string;

  @PrimaryColumn({ type: 'varchar', length: 128, name: 'param_key' })
  paramKey!: string;

  @Column({ type: 'jsonb' })
  value!: unknown;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
