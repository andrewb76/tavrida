import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'invite_code', schema: 'user_profile' })
export class InviteCodeEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('varchar', { unique: true })
  code!: string;

  @Column('varchar', { name: 'issuer_id', length: 128 })
  issuerId!: string;

  @Column('varchar', { name: 'logto_token' })
  logtoToken!: string;

  @Column('varchar', { nullable: true })
  email!: string | null;

  @Column('int', { name: 'max_uses', default: 1 })
  maxUses!: number;

  @Column('int', { name: 'uses_count', default: 0 })
  usesCount!: number;

  @Column('timestamptz', { name: 'expires_at' })
  expiresAt!: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
