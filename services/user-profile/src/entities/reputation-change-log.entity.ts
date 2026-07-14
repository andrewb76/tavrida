import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';

export type ReputationMetric = 'karma' | 'rating';

export type ReputationChangeSource =
  | 'ADMIN_ADJUST'
  | 'FORUM_VOTE'
  | 'DEAL_FEEDBACK'
  | 'REFERRAL'
  | 'BONUS'
  | 'PENALTY'
  | 'SYSTEM';

@Entity({ name: 'reputation_change_log', schema: 'user_profile' })
@Index(['userId', 'metric', 'createdAt'])
export class ReputationChangeLogEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('varchar', { name: 'user_id', length: 128 })
  userId!: string;

  @Column('varchar', { length: 16 })
  metric!: ReputationMetric;

  @Column('decimal', { precision: 10, scale: 2 })
  delta!: string;

  @Column('decimal', { name: 'balance_after', precision: 10, scale: 2 })
  balanceAfter!: string;

  @Column('varchar', { length: 32 })
  source!: ReputationChangeSource;

  @Column('varchar', { name: 'actor_id', length: 128, nullable: true })
  actorId!: string | null;

  @Column('varchar', { name: 'reference_id', length: 128, nullable: true })
  referenceId!: string | null;

  @Column('varchar', { length: 512, nullable: true })
  note!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
