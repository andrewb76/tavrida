import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';
import type { ChatContextType, ChatKind } from '../common/chat.types';

@Entity({ name: 'chat', schema: 'chat' })
@Index('uq_chat_direct_key', ['directKey'], {
  unique: true,
  where: '"direct_key" IS NOT NULL',
})
@Index('uq_chat_topic_context', ['contextType', 'contextId'], {
  unique: true,
  where: "\"context_type\" = 'FORUM_TOPIC' AND \"context_id\" IS NOT NULL",
})
export class ChatEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 16 })
  kind!: ChatKind;

  @Column({ type: 'boolean', default: false })
  self!: boolean;

  @Column({ name: 'direct_key', type: 'varchar', length: 280, nullable: true })
  directKey!: string | null;

  @Column({ name: 'context_type', type: 'varchar', length: 32, nullable: true })
  contextType!: ChatContextType | null;

  @Column({ name: 'context_id', type: 'uuid', nullable: true })
  contextId!: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  title!: string | null;

  @Column({ name: 'spawned_from_chat_id', type: 'uuid', nullable: true })
  spawnedFromChatId!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
