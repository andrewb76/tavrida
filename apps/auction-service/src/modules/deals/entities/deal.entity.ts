import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn, ManyToOne } from 'typeorm';
import { Auction } from '../../auctions/entities/auction.entity';
import { User } from '../../users/entities/user.entity';

export enum DealStatus {
  WAITING_FOR_PAYMENT = 'waiting_for_payment', // Ждем, пока покупатель переведет деньги напрямую
  PAYMENT_CONFIRMED = 'payment_confirmed',     // Продавец подтвердил получение денег
  SHIPPED = 'shipped',                         // Продавец отправил посылку и ввел трек-номер
  DELIVERED = 'delivered',                     // Покупатель подтвердил получение товара (Сделка успешна)
  DISPUTE = 'dispute'                          // Открыт спор модератором
}

@Entity('deals')
export class Deal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => Auction)
  @JoinColumn()
  auction: Auction;

  @ManyToOne(() => User)
  buyer: User;

  @ManyToOne(() => User)
  seller: User;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  finalPrice: number;

  @Column({ type: 'enum', enum: DealStatus, default: DealStatus.WAITING_FOR_PAYMENT })
  status: DealStatus;

  @Column({ nullable: true })
  trackingNumber: string; // Почтовый трек-номер посылки антиквариата

  @Column({ type: 'timestamp', nullable: true })
  paymentConfirmedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  shippedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
