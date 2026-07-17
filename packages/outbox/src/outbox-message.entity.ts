import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import type { DomainEventEnvelope } from './types';

@Entity({ name: 'outbox_message' })
@Index('idx_outbox_pending', ['availableAt'], {
  where: '"published_at" IS NULL',
})
export class OutboxMessageEntity {
  @PrimaryColumn('uuid', { name: 'event_id' })
  eventId!: string;

  @Column('varchar', { name: 'event_type', length: 128 })
  eventType!: string;

  @Column('jsonb')
  envelope!: DomainEventEnvelope;

  @Column('timestamptz', { name: 'occurred_at' })
  occurredAt!: Date;

  @Column('timestamptz', { name: 'available_at' })
  availableAt!: Date;

  @Column('int', { name: 'attempt_count', default: 0 })
  attemptCount!: number;

  @Column('timestamptz', { name: 'published_at', nullable: true })
  publishedAt!: Date | null;

  @Column('text', { name: 'last_error', nullable: true })
  lastError!: string | null;

  @Column('timestamptz', { name: 'locked_until', nullable: true })
  lockedUntil!: Date | null;

  @Column('varchar', { name: 'locked_by', length: 128, nullable: true })
  lockedBy!: string | null;
}
