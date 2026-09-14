import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'user_value', schema: 'settings' })
export class UserValueEntity {
  @PrimaryColumn({ type: 'varchar', length: 128, name: 'user_id' })
  userId!: string;

  @PrimaryColumn({ type: 'varchar', length: 128, name: 'param_key' })
  paramKey!: string;

  @Column({ type: 'jsonb' })
  value!: unknown;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
