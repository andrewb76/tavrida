import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { ListingCategory, ListingStatus } from '../common/marketplace.types';

@Entity({ name: 'service_listing', schema: 'marketplace' })
@Index('idx_listing_provider', ['providerId'])
@Index('idx_listing_status_category', ['status', 'category'])
export class ServiceListingEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 128 })
  providerId!: string;

  @Column({ type: 'varchar', length: 256 })
  title!: string;

  @Column({ type: 'text', default: '' })
  description!: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  price!: string;

  @Column({ type: 'varchar', length: 3, default: 'RUB' })
  currency!: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  category!: ListingCategory | null;

  @Column({ type: 'varchar', length: 16, default: 'DRAFT' })
  status!: ListingStatus;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
