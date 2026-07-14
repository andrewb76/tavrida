import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'processed_event', schema: 'deal_feedback' })
export class ProcessedEventEntity {
  @PrimaryColumn({ type: 'uuid' })
  eventId!: string;

  @Column({ type: 'varchar', length: 128 })
  eventType!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  processedAt!: Date;
}
