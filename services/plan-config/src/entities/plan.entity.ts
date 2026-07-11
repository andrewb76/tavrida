import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'plan', schema: 'plan_config' })
export class PlanEntity {
  @PrimaryColumn('varchar', { length: 32 })
  id!: string;

  @Column('text')
  title!: string;

  @Column('text', { default: '' })
  description!: string;

  @Column('decimal', { name: 'monthly_price', precision: 12, scale: 2, default: 0 })
  monthlyPrice!: string;

  @Column('decimal', { name: 'yearly_price', precision: 12, scale: 2, default: 0 })
  yearlyPrice!: string;

  @Column('boolean', { name: 'is_active', default: true })
  isActive!: boolean;
}
