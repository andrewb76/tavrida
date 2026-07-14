import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { ForumContentType } from './reaction.entity';

/** Exclusive +/- vote per user per content. Value is only +1 or -1. */
@Entity({ schema: 'forum', name: 'content_vote' })
export class ContentVoteEntity {
  @PrimaryColumn('uuid', { name: 'content_id' })
  contentId!: string;

  @Column('varchar', { name: 'content_type', length: 16 })
  contentType!: ForumContentType;

  @PrimaryColumn('varchar', { name: 'user_id', length: 128 })
  userId!: string;

  /** +1 or -1 */
  @Column('smallint')
  value!: 1 | -1;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
