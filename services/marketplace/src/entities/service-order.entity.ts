import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { OrderStatus } from '../common/marketplace.types';

@Entity({ name: 'service_order', schema: 'marketplace' })
@Index('idx_order_provider', ['providerId', 'status'])
@Index('idx_order_customer', ['customerId', 'status'])
@Index('idx_order_listing', ['listingId'])
export class ServiceOrderEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  listingId!: string;

  @Column({ type: 'varchar', length: 128 })
  providerId!: string;

  @Column({ type: 'varchar', length: 128 })
  customerId!: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  agreedPrice!: string;

  @Column({ type: 'varchar', length: 3, default: 'RUB' })
  currency!: string;

  @Column({ type: 'varchar', length: 16, default: 'PENDING' })
  status!: OrderStatus;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
