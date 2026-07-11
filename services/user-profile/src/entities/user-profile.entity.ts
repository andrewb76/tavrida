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

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
