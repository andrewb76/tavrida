import { Column, Entity, PrimaryColumn } from 'typeorm';

export type PlanVariableValueType = 'limit' | 'feature' | 'enum' | 'price';
export type PlanVariableSyncStatus = 'active' | 'stale';

@Entity({ name: 'plan_variable', schema: 'plan_config' })
export class PlanVariableEntity {
  @PrimaryColumn('varchar', { length: 128 })
  key!: string;

  @Column('varchar', { length: 64 })
  service!: string;

  @Column('text')
  name!: string;

  @Column('text', { default: '' })
  description!: string;

  @Column('varchar', { name: 'value_type', length: 16 })
  valueType!: PlanVariableValueType;

  @Column('int', { name: 'min_value', nullable: true })
  minValue!: number | null;

  @Column('int', { name: 'default_value', nullable: true })
  defaultValue!: number | null;

  @Column('int', { name: 'max_value', nullable: true })
  maxValue!: number | null;

  @Column('varchar', { name: 'sync_status', length: 16, default: 'active' })
  syncStatus!: PlanVariableSyncStatus;
}
