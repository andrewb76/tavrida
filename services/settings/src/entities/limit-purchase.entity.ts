import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'limit_purchase', schema: 'settings' })
export class LimitPurchaseEntity {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @Column({ type: 'varchar', length: 128, name: 'param_key' })
  paramKey!: string;

  @Column({ type: 'varchar', length: 128, name: 'user_id' })
  userId!: string;

  @Column({ type: 'varchar', length: 8 })
  period!: string;

  @Column({ type: 'int', default: 0 })
  purchased!: number;

  @Column({ type: 'int', default: 0 })
  used!: number;

  @Column({ type: 'timestamptz', name: 'expires_at' })
  expiresAt!: Date;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @Column({ type: 'jsonb', nullable: true })
  meta!: unknown;
}
