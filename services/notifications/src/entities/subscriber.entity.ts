import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ schema: 'notifications', name: 'subscriber' })
export class SubscriberEntity {
  @PrimaryColumn('varchar', { name: 'user_id', length: 128 })
  userId!: string;

  @Column('varchar', { nullable: true, length: 320 })
  email!: string | null;

  @Column('varchar', { name: 'fcm_token', nullable: true, length: 512 })
  fcmToken!: string | null;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
