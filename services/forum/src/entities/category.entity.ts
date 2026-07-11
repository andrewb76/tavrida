import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity({ schema: 'forum', name: 'category' })
export class CategoryEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('uuid', { name: 'parent_id', nullable: true })
  parentId!: string | null;

  @Column('varchar', { length: 64 })
  slug!: string;

  @Column('varchar', { length: 128 })
  title!: string;

  @Column('text', { default: '' })
  description!: string;

  @Column('jsonb', { default: () => "'{}'" })
  policy!: Record<string, unknown>;

  @Column('int', { name: 'sort_order', default: 0 })
  sortOrder!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
