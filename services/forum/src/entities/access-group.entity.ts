import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ schema: 'forum', name: 'access_group' })
export class AccessGroupEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('varchar', { length: 128, unique: true })
  name!: string;

  @Column('text', { default: '' })
  description!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
