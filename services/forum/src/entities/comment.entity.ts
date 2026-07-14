import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { MediaAttachment } from '@tavrida/object-storage';

@Entity({ schema: 'forum', name: 'comment' })
export class CommentEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('uuid', { name: 'topic_id' })
  topicId!: string;

  @Column('varchar', { name: 'author_id', length: 128 })
  authorId!: string;

  @Column('uuid', { name: 'parent_id', nullable: true })
  parentId!: string | null;

  @Column('text')
  body!: string;

  @Column('jsonb', { default: () => "'[]'" })
  attachments!: MediaAttachment[];

  @Column('uuid', { name: 'promoted_topic_id', nullable: true })
  promotedTopicId!: string | null;

  /** Denormalized +/- aggregates (updated with content_vote). */
  @Column('int', { name: 'vote_plus_count', default: 0 })
  votePlusCount!: number;

  @Column('int', { name: 'vote_minus_count', default: 0 })
  voteMinusCount!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
