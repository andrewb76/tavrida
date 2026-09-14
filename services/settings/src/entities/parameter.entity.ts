import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

export type ParameterCategory = 'system-var' | 'tarif-var' | 'limited-user-var' | 'user-var';
export type ParameterSyncStatus = 'active' | 'stale';

@Entity({ name: 'parameter', schema: 'settings' })
export class ParameterEntity {
  @PrimaryColumn({ type: 'varchar', length: 128 })
  key!: string;

  @Column({ type: 'varchar', length: 64 })
  service!: string;

  @Column({ type: 'varchar', length: 16 })
  category!: ParameterCategory;

  @Column({ type: 'text', default: '' })
  name!: string;

  @Column({ type: 'text', default: '' })
  description!: string;

  @Column({ type: 'varchar', length: 16, name: 'param_type', default: 'int' })
  paramType!: string;

  @Column({ type: 'jsonb', name: 'default_value', nullable: true })
  defaultValue!: unknown;

  @Column({ type: 'boolean', name: 'user_override', default: false })
  userOverride!: boolean;

  @Column({ type: 'int', name: 'sort_order', default: 0 })
  sortOrder!: number;

  @Column({ type: 'varchar', length: 16, name: 'sync_status', default: 'active' })
  syncStatus!: ParameterSyncStatus;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
