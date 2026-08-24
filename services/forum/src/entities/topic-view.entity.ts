import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ schema: 'forum', name: 'topic_view' })
export class TopicViewEntity {
  @PrimaryColumn('uuid', { name: 'topic_id' })
  topicId!: string;

  @PrimaryColumn('varchar', { name: 'user_id', length: 128 })
  userId!: string;

  @Column('timestamptz', { name: 'viewed_at', default: () => 'now()' })
  viewedAt!: Date;

  /** Reserved for future paid feature: stealth views visible only to admins. */
  @Column('boolean', { name: 'is_hidden', default: false })
  isHidden!: boolean;
}
