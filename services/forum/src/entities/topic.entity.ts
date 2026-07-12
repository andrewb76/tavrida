import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { MediaAttachment } from '@tavrida/object-storage';

@Entity({ schema: 'forum', name: 'topic' })
export class TopicEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('uuid', { name: 'category_id' })
  categoryId!: string;

  @Column('varchar', { name: 'author_id', length: 128 })
  authorId!: string;

  @Column('varchar', { length: 256 })
  title!: string;

  @Column('text')
  body!: string;

  @Column('jsonb', { default: () => "'[]'" })
  attachments!: MediaAttachment[];

  @Column('boolean', { name: 'is_pinned', default: false })
  isPinned!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
