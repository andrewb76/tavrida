import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, Index, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Category } from './category.entity';

export enum AuctionType {
  ENGLISH = 'english',
  DUTCH = 'dutch',
  BLIND = 'blind',
  FIXED_PRICE = 'fixed_price'
}

export enum AuctionStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  ACTIVE = 'active',
  PAUSED = 'paused',
  FINISHED = 'finished',
  CANCELLED = 'cancelled'
}

@Entity('auctions')
export class Auction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { eager: true })
  seller: User;

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'jsonb', default: [] })
  images: string[];

  @Column({ type: 'enum', enum: AuctionType })
  type: AuctionType;

  @Column({ type: 'enum', enum: AuctionStatus, default: AuctionStatus.DRAFT })
  status: AuctionStatus;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  currentPrice: number;

  @Column({ type: 'timestamp' })
  startTime: Date;

  @Column({ type: 'timestamp' })
  plannedEndTime: Date; // Изначальное время финала для графиков d3.js

  @Column({ type: 'timestamp' })
  endTime: Date; // Динамическое время финала (меняется анти-снайпером)

  @CreateDateColumn()
  createdAt: Date;
  
  @ManyToOne(() => Category, (category) => category.auctions, { eager: true, nullable: false })
  @JoinColumn({ name: 'categoryId' }) // Явно указываем колонку внешнего ключа в БД
  category: Category;
}

