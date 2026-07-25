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

  /** Denormalized +/- aggregates (updated with content_vote). */
  @Column('int', { name: 'vote_plus_count', default: 0 })
  votePlusCount!: number;

  @Column('int', { name: 'vote_minus_count', default: 0 })
  voteMinusCount!: number;

  /** Denormalized tag slugs (SoT: forum.tag + forum.content_tag). */
  @Column('jsonb', { default: () => "'[]'" })
  tags!: string[];

  /** DRAFT — author-only; PUBLISHED — public. See docs/05-microservices/forum/drafts.md */
  @Column('varchar', { length: 16, default: 'PUBLISHED' })
  status!: 'DRAFT' | 'PUBLISHED';

  @Column('timestamptz', { name: 'published_at', nullable: true })
  publishedAt!: Date | null;

  @Column('timestamptz', { name: 'deleted_at', nullable: true })
  deletedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
