import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity({ schema: 'auction', name: 'user_id_mapping' })
export class UserIdMappingEntity {
  @PrimaryColumn('int', { name: 'legacy_id' })
  legacyId!: number;

  @Column('varchar', { name: 'logto_id', length: 128, unique: true })
  logtoId!: string;

  @Column('varchar', { length: 20, nullable: true })
  nick!: string | null;

  @Column('varchar', { length: 50, nullable: true })
  email!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
