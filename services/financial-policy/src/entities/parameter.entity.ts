import { Column, Entity, PrimaryColumn } from 'typeorm';

export type ParameterValueType = 'limit' | 'feature' | 'enum';

@Entity({ name: 'parameter', schema: 'financial_policy' })
export class ParameterEntity {
  @PrimaryColumn('varchar', { length: 128 })
  key!: string;

  @Column('varchar', { length: 64 })
  service!: string;

  @Column('text')
  name!: string;

  @Column('text', { default: '' })
  description!: string;

  @Column('varchar', { name: 'value_type', length: 16 })
  valueType!: ParameterValueType;

  @Column('int', { name: 'min_value', nullable: true })
  minValue!: number | null;

  @Column('int', { name: 'default_value', nullable: true })
  defaultValue!: number | null;

  @Column('int', { name: 'max_value', nullable: true })
  maxValue!: number | null;
}
