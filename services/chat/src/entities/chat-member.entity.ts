import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import type { ChatMemberRole } from '../common/chat.types';

@Entity({ name: 'chat_member', schema: 'chat' })
@Index('idx_chat_member_user', ['userId'])
export class ChatMemberEntity {
  @PrimaryColumn({ name: 'chat_id', type: 'uuid' })
  chatId!: string;

  @PrimaryColumn({ name: 'user_id', type: 'varchar', length: 128 })
  userId!: string;

  @Column({ type: 'varchar', length: 16, default: 'MEMBER' })
  role!: ChatMemberRole;

  @Column({ name: 'joined_at', type: 'timestamptz', default: () => 'now()' })
  joinedAt!: Date;

  @Column({ name: 'hidden_at', type: 'timestamptz', nullable: true })
  hiddenAt!: Date | null;

  @Column({ name: 'left_at', type: 'timestamptz', nullable: true })
  leftAt!: Date | null;

  @Column({ name: 'last_read_message_id', type: 'uuid', nullable: true })
  lastReadMessageId!: string | null;

  @Column({ name: 'last_read_at', type: 'timestamptz', nullable: true })
  lastReadAt!: Date | null;
}
