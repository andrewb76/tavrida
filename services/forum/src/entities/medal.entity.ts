import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity({ schema: 'forum', name: 'medal' })
export class MedalEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('varchar', { length: 200 })
  name!: string;

  @Column('text', { default: '' })
  description!: string;

  @Column('varchar', { name: 'icon_url', length: 512, nullable: true })
  iconUrl!: string | null;

  @Column('int', { name: 'disp_position', default: 0 })
  dispPosition!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
