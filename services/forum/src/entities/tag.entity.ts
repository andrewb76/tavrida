import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity({ schema: 'forum', name: 'tag' })
export class TagEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('varchar', { unique: true, length: 64 })
  slug!: string;

  @Column('varchar', { name: 'display_name', length: 64 })
  displayName!: string;

  @Column('text', { nullable: true })
  description!: string | null;

  @Column('varchar', { nullable: true, length: 32 })
  color!: string | null;

  @Column('boolean', { name: 'is_official', default: false })
  isOfficial!: boolean;

  @Column('boolean', { name: 'is_hidden', default: false })
  isHidden!: boolean;

  @Column('int', { name: 'usage_count', default: 0 })
  usageCount!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
