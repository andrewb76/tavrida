import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity({ schema: 'forum', name: 'user_medal' })
export class UserMedalEntity {
  @PrimaryColumn('varchar', { name: 'user_id', length: 128 })
  userId!: string;

  @PrimaryColumn('uuid', { name: 'medal_id' })
  medalId!: string;

  @CreateDateColumn({ name: 'awarded_at', type: 'timestamptz' })
  awardedAt!: Date;

  @Column('varchar', { name: 'awarded_by', length: 128, nullable: true })
  awardedBy!: string | null;

  @Column('varchar', { length: 512, nullable: true })
  reason!: string | null;

  @Column('timestamptz', { name: 'revoked_at', nullable: true })
  revokedAt!: Date | null;
}
