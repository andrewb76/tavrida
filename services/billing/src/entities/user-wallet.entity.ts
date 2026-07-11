import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'user_wallet', schema: 'billing' })
export class UserWalletEntity {
  @PrimaryColumn('varchar', { name: 'user_id', length: 128 })
  userId!: string;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  balance!: string;

  @Column('varchar', { length: 3, default: 'RUB' })
  currency!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
