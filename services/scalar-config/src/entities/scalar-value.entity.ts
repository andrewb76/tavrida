import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'scalar_value', schema: 'scalar_config' })
export class ScalarValueEntity {
  @PrimaryColumn({ type: 'varchar', length: 128 })
  key!: string;

  @Column({ type: 'jsonb' })
  value!: unknown;

  @Column({ type: 'varchar', length: 32, default: 'global' })
  scope!: string;

  @Column({ type: 'varchar', length: 128, nullable: true })
  updatedBy!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
