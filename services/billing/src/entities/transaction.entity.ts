import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

export type TransactionType = 'DEPOSIT' | 'CHARGE' | 'REFUND' | 'CREDIT';
export type TransactionStatus = 'PENDING' | 'COMPLETED' | 'FAILED';

@Entity({ name: 'transaction', schema: 'billing' })
@Index('uq_billing_transaction_idempotency', ['userId', 'idempotencyKey'], {
  unique: true,
  where: '"idempotency_key" IS NOT NULL',
})
export class TransactionEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('varchar', { name: 'user_id', length: 128 })
  userId!: string;

  @Column('varchar', { length: 16 })
  type!: TransactionType;

  @Column('decimal', { precision: 12, scale: 2 })
  amount!: string;

  @Column('text', { default: '' })
  description!: string;

  @Column('varchar', { nullable: true })
  target!: string | null;

  @Column('varchar', { length: 16, default: 'COMPLETED' })
  status!: TransactionStatus;

  @Column('varchar', { name: 'idempotency_key', length: 64, nullable: true })
  idempotencyKey!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
