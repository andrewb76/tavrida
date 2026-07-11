import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'invitation', schema: 'user_profile' })
export class InvitationEntity {
  @PrimaryColumn('varchar', { name: 'invitee_id', length: 128 })
  inviteeId!: string;

  @Column('varchar', { name: 'inviter_id', length: 128 })
  inviterId!: string;

  @Column('uuid', { name: 'invite_code_id', nullable: true })
  inviteCodeId!: string | null;

  @Column('timestamptz', { name: 'accepted_at' })
  acceptedAt!: Date;
}
