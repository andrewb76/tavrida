import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'profile_note', schema: 'user_profile' })
@Unique('uq_profile_note_owner_author', ['ownerId', 'authorId'])
export class ProfileNoteEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('varchar', { name: 'owner_id', length: 128 })
  ownerId!: string;

  @Column('varchar', { name: 'author_id', length: 128 })
  authorId!: string;

  @Column('text')
  text!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
