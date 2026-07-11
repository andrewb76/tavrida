import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'plan_parameter', schema: 'financial_policy' })
export class PlanParameterEntity {
  @PrimaryColumn('varchar', { name: 'plan_id', length: 32 })
  planId!: string;

  @PrimaryColumn('varchar', { name: 'parameter_key', length: 128 })
  parameterKey!: string;

  @Column('int', { name: 'limit_value', nullable: true })
  limitValue!: number | null;

  @Column('boolean', { name: 'is_feature_enabled', default: false })
  isFeatureEnabled!: boolean;

  @Column('jsonb', { name: 'enum_values', nullable: true })
  enumValues!: string[] | null;
}
