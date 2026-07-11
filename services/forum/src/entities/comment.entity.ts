import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

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

  @Column('uuid', { name: 'promoted_topic_id', nullable: true })
  promotedTopicId!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
