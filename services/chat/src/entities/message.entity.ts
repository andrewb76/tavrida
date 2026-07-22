import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';
import type { MessageMention } from '../common/chat.types';

@Entity({ name: 'message', schema: 'chat' })
@Index('idx_message_chat_created', ['chatId', 'createdAt'])
export class MessageEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'chat_id', type: 'uuid' })
  chatId!: string;

  @Column({ name: 'author_id', type: 'varchar', length: 128 })
  authorId!: string;

  @Column({ type: 'text' })
  body!: string;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  mentions!: MessageMention[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Column({ name: 'edited_at', type: 'timestamptz', nullable: true })
  editedAt!: Date | null;

  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;
}
