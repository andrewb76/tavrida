import { Column, Entity, PrimaryColumn } from 'typeorm';

export type ScalarVariableSyncStatus = 'active' | 'stale';

@Entity({ name: 'scalar_variable', schema: 'scalar_config' })
export class ScalarVariableEntity {
  @PrimaryColumn({ type: 'varchar', length: 128 })
  key!: string;

  @Column({ type: 'varchar', length: 32 })
  type!: string;

  @Column({ type: 'jsonb', name: 'default_value' })
  defaultValue!: unknown;

  @Column({ type: 'varchar', length: 64 })
  service!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  /** `stale` — ключ больше не в sync-манифесте владельца; удаление только вручную admin. */
  @Column({ type: 'varchar', name: 'sync_status', length: 16, default: 'active' })
  syncStatus!: ScalarVariableSyncStatus;
}
