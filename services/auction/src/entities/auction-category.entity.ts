import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ schema: 'auction', name: 'auction_category' })
export class AuctionCategoryEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('int', { name: 'legacy_id', unique: true })
  legacyId!: number;

  @Column('int', { name: 'parent_legacy_id', nullable: true })
  parentLegacyId!: number | null;

  @Column('varchar', { name: 'parent_id', nullable: true })
  parentId!: string | null;

  @Column('varchar', { length: 256 })
  name!: string;

  @Column('int', { default: 0 })
  level!: number;

  @Column('int', { default: 0 })
  leftId!: number;

  @Column('int', { default: 0 })
  rightId!: number;

  @Column('int', { default: 0 })
  auctionCount!: number;
}
