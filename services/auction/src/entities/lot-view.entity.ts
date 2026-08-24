import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ schema: 'auction', name: 'lot_view' })
export class LotViewEntity {
  @PrimaryColumn('uuid', { name: 'auction_id' })
  auctionId!: string;

  @PrimaryColumn('varchar', { name: 'user_id', length: 128 })
  userId!: string;

  @Column('timestamptz', { name: 'viewed_at', default: () => 'now()' })
  viewedAt!: Date;

  /** Reserved for future paid feature: stealth views visible only to admins. */
  @Column('boolean', { name: 'is_hidden', default: false })
  isHidden!: boolean;
}
