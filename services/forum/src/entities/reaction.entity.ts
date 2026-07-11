import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

export type ForumContentType = 'topic' | 'comment';

@Entity({ schema: 'forum', name: 'reaction' })
export class ReactionEntity {
  @PrimaryColumn('uuid', { name: 'content_id' })
  contentId!: string;

  @Column('varchar', { name: 'content_type', length: 16 })
  contentType!: ForumContentType;

  @PrimaryColumn('varchar', { name: 'user_id', length: 128 })
  userId!: string;

  @Column('varchar', { name: 'emoji_key', length: 32 })
  emojiKey!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
