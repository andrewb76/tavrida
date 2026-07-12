import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { MediaDomain, UploadIntentStatus } from '@tavrida/object-storage';

@Entity({ schema: 'bff', name: 'media_upload_intent' })
export class MediaUploadIntentEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('varchar', { name: 'user_id', length: 128 })
  userId!: string;

  @Column('varchar', { length: 16 })
  domain!: MediaDomain;

  @Column('varchar', { name: 'object_key', length: 512 })
  objectKey!: string;

  @Column('varchar', { name: 'content_type', length: 128 })
  contentType!: string;

  @Column('int', { name: 'size_bytes' })
  sizeBytes!: number;

  @Column('varchar', { length: 256 })
  filename!: string;

  @Column('varchar', { length: 16 })
  status!: UploadIntentStatus;

  @Column('varchar', { name: 'public_url', length: 1024 })
  publicUrl!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @Column('timestamptz', { name: 'expires_at' })
  expiresAt!: Date;

  @Column('timestamptz', { name: 'confirmed_at', nullable: true })
  confirmedAt!: Date | null;
}
