import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
} from 'typeorm';

@Entity({ schema: 'auction', name: 'expert_appraisal' })
export class ExpertAppraisalEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('uuid', { name: 'auction_id' })
  auctionId!: string;

  @Column('varchar', { name: 'expert_id', length: 128 })
  expertId!: string;

  @Column('text')
  summary!: string;

  @Column('numeric', { name: 'estimated_value_min', precision: 12, scale: 2, nullable: true })
  estimatedValueMin!: string | null;

  @Column('numeric', { name: 'estimated_value_max', precision: 12, scale: 2, nullable: true })
  estimatedValueMax!: string | null;

  @Column('varchar', { length: 3, default: 'RUB' })
  currency!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
