import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'user_profile', schema: 'user_profile' })
export class UserProfileEntity {
  @PrimaryColumn('varchar', { name: 'user_id', length: 128 })
  userId!: string;

  @Column('varchar', { name: 'inviter_id', length: 128, nullable: true })
  inviterId!: string | null;

  @Column('timestamptz', { name: 'invitation_accepted_at', nullable: true })
  invitationAcceptedAt!: Date | null;

  @Column('varchar', { name: 'display_name', nullable: true })
  displayName!: string | null;

  @Column('varchar', { nullable: true })
  email!: string | null;

  @Column('varchar', { nullable: true })
  username!: string | null;

  @Column('varchar', { name: 'avatar_url', nullable: true })
  avatarUrl!: string | null;

  @Column('varchar', { name: 'primary_phone', nullable: true })
  primaryPhone!: string | null;

  @Column('boolean', { name: 'is_suspended', default: false })
  isSuspended!: boolean;

  @Column('timestamptz', { name: 'deleted_at', nullable: true })
  deletedAt!: Date | null;

  @Column('timestamptz', { name: 'logto_synced_at', nullable: true })
  logtoSyncedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
