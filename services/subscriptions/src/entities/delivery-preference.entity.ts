import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import type { DigestFrequency, QuietHours } from '../common/subscription.types';

@Entity({ name: 'delivery_preference', schema: 'subscriptions' })
export class DeliveryPreferenceEntity {
  @PrimaryColumn({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'boolean', default: false })
  emailDigestEnabled!: boolean;

  @Column({ type: 'boolean', default: true })
  pushEnabled!: boolean;

  @Column({ type: 'varchar', length: 16, default: 'DAILY' })
  digestFrequency!: DigestFrequency;

  @Column({ type: 'jsonb', nullable: true })
  quietHours!: QuietHours | null;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
