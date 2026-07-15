import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

/** Cross-domain content kinds; forum MVP writes `topic` only. */
export type ContentTagType = 'topic' | 'comment' | 'auction' | 'marketplace_listing';

@Entity({ schema: 'forum', name: 'content_tag' })
export class ContentTagEntity {
  @PrimaryColumn('uuid', { name: 'tag_id' })
  tagId!: string;

  @PrimaryColumn('varchar', { name: 'content_type', length: 32 })
  contentType!: ContentTagType;

  @PrimaryColumn('uuid', { name: 'content_id' })
  contentId!: string;

  @Column('int', { nullable: true })
  priority!: number | null;

  @Column('varchar', { name: 'added_by', length: 128 })
  addedBy!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
