import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'setting_key', schema: 'settings' })
export class SettingKeyEntity {
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
}
