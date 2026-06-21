// src/config/entities/config.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  Unique,
  Index,
} from 'typeorm';

@Entity('configs')
@Unique(['service', 'key'])
export class Config {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  service: string; // 'auction', 'forum', etc.

  @Column()
  key: string;

  @Column({ type: 'jsonb' })
  value: any; // число, строка, объект, массив

  @Column({ nullable: true })
  key_description: string;

  @Column({ nullable: true })
  value_description: string;

  @Column({ default: true })
  isActive: boolean; // мягкое удаление

  @UpdateDateColumn()
  updatedAt: Date;
}
