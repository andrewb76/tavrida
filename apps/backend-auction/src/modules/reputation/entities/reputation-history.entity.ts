import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, Index } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Deal } from '../../deals/entities/deal.entity';

export enum ReputationChangeSource {
  DEAL_REVIEW = 'deal_review',
  MODERATOR_ADJUSTMENT = 'moderator'
}

@Entity('reputation_history')
@Index(['user', 'createdAt'])
export class ReputationHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User; // Кому изменили рейтинг

  @Column({ type: 'int' })
  value: number; // +1 или -1

  @Column({ type: 'enum', enum: ReputationChangeSource })
  source: ReputationChangeSource;

  @ManyToOne(() => Deal, { nullable: true, onDelete: 'SET NULL' })
  deal: Deal; // Привязка к сделке

  @Column({ type: 'text' })
  comment: string; // Текст отзыва или причина модератора

  @CreateDateColumn()
  createdAt: Date;
}
