import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  logtoId: string; // Связка с авторизацией Logto

  @Column()
  username: string;

  // Кэш для быстрого чтения PrimeVue таблицами
  @Column({ default: 0 })
  cachedRatingPositive: number;

  @Column({ default: 0 })
  cachedRatingNegative: number;

  @Column({ type: 'timestamp', nullable: true })
  bannedUntil: Date;

  @Column({ nullable: true })
  banReason: string;

  @CreateDateColumn()
  createdAt: Date;
}
