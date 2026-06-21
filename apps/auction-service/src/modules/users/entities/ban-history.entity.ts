import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { User } from './user.entity';

@Entity('user_bans_history')
export class UserBanHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User; // Кого забанили

  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'timestamp' })
  startedAt: Date;

  @Column({ type: 'timestamp' })
  endedAt: Date; // До какого времени действовал бан

  @Column()
  moderatorLogtoId: string; // Кто выдал бан из панели управления

  @CreateDateColumn()
  createdAt: Date;
}
