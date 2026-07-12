import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'user_rating', schema: 'user_profile' })
export class UserRatingEntity {
  @PrimaryColumn('varchar', { name: 'user_id', length: 128 })
  userId!: string;

  @Column('decimal', { name: 'total_rating', precision: 4, scale: 2, default: '0' })
  totalRating!: string;

  @Column('decimal', { precision: 10, scale: 2, default: '0' })
  karma!: string;

  @Column('decimal', { name: 'referral_karma', precision: 10, scale: 2, default: '0' })
  referralKarma!: string;

  @Column('decimal', { name: 'referral_rating', precision: 4, scale: 2, default: '0' })
  referralRating!: string;

  @Column('int', { name: 'verified_sales', default: 0 })
  verifiedSales!: number;

  @Column('int', { name: 'pending_sales', default: 0 })
  pendingSales!: number;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
