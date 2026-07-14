import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'period', schema: 'periods' })
@Index('idx_period_category_range', ['categoryId', 'startsOn', 'endsOn'])
@Index('idx_period_parent_sort', ['parentId', 'sortIndex'])
@Index('idx_period_root', ['rootId'])
export class PeriodEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  categoryId!: string;

  @Column({ type: 'uuid', nullable: true })
  parentId!: string | null;

  @Column({ type: 'uuid' })
  rootId!: string;

  @Column({ type: 'int', default: 0 })
  depth!: number;

  @Column({ type: 'int', default: 0 })
  sortIndex!: number;

  @Column({ type: 'date' })
  startsOn!: string;

  @Column({ type: 'date' })
  endsOn!: string;

  @Column({ type: 'varchar', length: 512 })
  title!: string;

  @Column({ type: 'text', default: '' })
  summary!: string;

  @Column({ type: 'text', default: '' })
  body!: string;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  metadata!: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
