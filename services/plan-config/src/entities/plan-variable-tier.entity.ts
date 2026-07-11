import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'plan_variable_tier', schema: 'plan_config' })
export class PlanVariableTierEntity {
  @PrimaryColumn('varchar', { name: 'plan_id', length: 32 })
  planId!: string;

  @PrimaryColumn('varchar', { name: 'variable_key', length: 128 })
  variableKey!: string;

  @Column('int', { name: 'limit_value', nullable: true })
  limitValue!: number | null;

  @Column('boolean', { name: 'is_feature_enabled', default: false })
  isFeatureEnabled!: boolean;

  @Column('jsonb', { name: 'enum_values', nullable: true })
  enumValues!: string[] | null;

  @Column('decimal', { name: 'price_amount', precision: 12, scale: 2, nullable: true })
  priceAmount!: string | null;

  @Column('boolean', { name: 'is_enabled', default: true })
  isEnabled!: boolean;
}
