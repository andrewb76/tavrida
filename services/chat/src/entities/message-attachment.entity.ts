import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'message_attachment', schema: 'chat' })
export class MessageAttachmentEntity {
  @PrimaryColumn({ name: 'message_id', type: 'uuid' })
  messageId!: string;

  @PrimaryColumn({ name: 'media_object_id', type: 'uuid' })
  mediaObjectId!: string;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;
}
