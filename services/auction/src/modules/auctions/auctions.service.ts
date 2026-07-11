import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { Repository } from 'typeorm';
import { AuctionEntity } from '../../entities/auction.entity';
import { BidEntity } from '../../entities/bid.entity';
import { ExpertAppraisalEntity } from '../../entities/expert-appraisal.entity';
import {
  clampLimit,
  decodeCursor,
  encodeCursor,
  filterAndSortRows,
  normalizeCatalogSort,
  normalizeCatalogStatus,
  type AuctionListRow,
  type ListAuctionsInput,
  isLive,
  isPromoted,
} from './auction-list.logic';

import {
  resolveInitialStatus,
  validateCreateAuction,
  type CreateAuctionInput,
} from './auction-create.logic';

@Injectable()
export class AuctionsService {
  constructor(
    @InjectRepository(AuctionEntity)
    private readonly auctions: Repository<AuctionEntity>,
    @InjectRepository(BidEntity)
    private readonly bids: Repository<BidEntity>,
    @InjectRepository(ExpertAppraisalEntity)
    private readonly expertAppraisals: Repository<ExpertAppraisalEntity>,
  ) {}

  async countSellerLotsToday(sellerId: string) {
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    const count = await this.auctions
      .createQueryBuilder('a')
      .where('a.seller_id = :sellerId', { sellerId })
      .andWhere('a.created_at >= :start', { start })
      .getCount();
    return { sellerId, lotsCreatedToday: count };
  }

  async create(input: CreateAuctionInput) {
    validateCreateAuction(input);

    const startsAt = new Date(input.startsAt);
    const endsAt = new Date(input.endsAt);
    const now = new Date();
    const promotedUntil =
      input.promote === true ? new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) : null;

    const row = this.auctions.create({
      id: randomUUID(),
      sellerId: input.sellerId,
      categoryId: input.categoryId ?? null,
      title: input.title.trim(),
      description: input.description.trim(),
      type: input.type,
      status: resolveInitialStatus(startsAt),
      startingPrice: String(input.startingPrice),
      currentPrice: String(input.startingPrice),
      bidIncrement: String(input.bidIncrement),
      reservePrice: input.reservePrice != null ? String(input.reservePrice) : null,
      currency: 'RUB',
      startsAt,
      endsAt,
      promotedUntil,
      images: (input.images ?? []).slice(0, 8),
      bidCount: 0,
      hasExpertAppraisal: false,
    });

    await this.auctions.save(row);
    return this.toDetail(row);
  }

  async getById(auctionId: string) {
    const row = await this.auctions.findOne({ where: { id: auctionId } });
    if (!row || row.status === 'DRAFT' || row.status === 'CANCELLED') {
      throw new NotFoundException({ type: 'not-found', detail: `Auction ${auctionId} not found` });
    }
    return this.toDetail(row);
  }

  async listBids(auctionId: string) {
    await this.assertPublicAuction(auctionId);
    const rows = await this.bids.find({
      where: { auctionId },
      order: { placedAt: 'DESC' },
      take: 50,
    });
    return {
      data: rows.map((row) => ({
        id: row.id,
        bidderId: row.bidderId,
        amount: Number(row.amount),
        currency: row.currency,
        placedAt: row.placedAt.toISOString(),
        isWinning: row.isWinning,
      })),
    };
  }

  async listExpertAppraisals(auctionId: string) {
    await this.assertPublicAuction(auctionId);
    const rows = await this.expertAppraisals.find({
      where: { auctionId },
      order: { createdAt: 'DESC' },
    });
    return {
      data: rows.map((row) => ({
        id: row.id,
        expertId: row.expertId,
        summary: row.summary,
        estimatedValueMin: row.estimatedValueMin != null ? Number(row.estimatedValueMin) : null,
        estimatedValueMax: row.estimatedValueMax != null ? Number(row.estimatedValueMax) : null,
        currency: row.currency,
        createdAt: row.createdAt.toISOString(),
      })),
    };
  }

  private async assertPublicAuction(auctionId: string) {
    const row = await this.auctions.findOne({ where: { id: auctionId } });
    if (!row || row.status === 'DRAFT' || row.status === 'CANCELLED') {
      throw new NotFoundException({ type: 'not-found', detail: `Auction ${auctionId} not found` });
    }
    return row;
  }

  private toDetail(row: AuctionEntity) {
    const now = new Date();
    const listRow = this.toListRow(row);
    const currentPrice = Number(row.currentPrice);
    const bidIncrement = Number(row.bidIncrement);
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      sellerId: row.sellerId,
      categoryId: row.categoryId,
      type: row.type,
      status: row.status,
      startingPrice: Number(row.startingPrice),
      currentPrice,
      bidIncrement,
      currency: row.currency,
      startsAt: row.startsAt?.toISOString() ?? null,
      endsAt: row.endsAt?.toISOString() ?? null,
      promotedUntil: row.promotedUntil?.toISOString() ?? null,
      reservePrice: row.reservePrice != null ? Number(row.reservePrice) : null,
      images: row.images ?? [],
      bidCount: row.bidCount,
      hasExpertAppraisal: row.hasExpertAppraisal,
      isLive: isLive(listRow, now),
      isPromoted: isPromoted(listRow, now),
      minNextBid: currentPrice + bidIncrement,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async list(input: ListAuctionsInput) {
    const now = input.now ?? new Date();
    const limit = clampLimit(input.limit);
    const status = normalizeCatalogStatus(input.status);
    const sort = normalizeCatalogSort(input.sort, input.q);

    const rows = await this.auctions.find({
      where: [
        { status: 'ACTIVE' },
        { status: 'SCHEDULED' },
        { status: 'ENDED' },
      ],
    });

    const mapped = rows.map((row) => this.toListRow(row));
    const filtered = filterAndSortRows(mapped, { ...input, status, sort, now });

    const cursor = decodeCursor(input.cursor);
    let startIndex = 0;
    if (cursor) {
      const idx = filtered.findIndex((row) => row.id === cursor.id);
      startIndex = idx >= 0 ? idx + 1 : 0;
    }

    const slice = filtered.slice(startIndex, startIndex + limit + 1);
    const hasMore = slice.length > limit;
    const page = hasMore ? slice.slice(0, limit) : slice;
    const last = page.at(-1);

    return {
      items: page.map((row) => this.toCard(row, now)),
      nextCursor: hasMore && last ? encodeCursor({ endsAt: last.endsAt, id: last.id }) : null,
      meta: {
        limit,
        searchScope: input.searchMode ?? 'TITLE',
        appliedFilters: {
          status,
          sort,
          ...(input.categoryId ? { categoryId: input.categoryId } : {}),
          ...(input.q ? { q: input.q } : {}),
        },
      },
    };
  }

  private toListRow(row: AuctionEntity): AuctionListRow {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      currentPrice: Number(row.currentPrice),
      currency: row.currency,
      status: row.status,
      type: row.type,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      promotedUntil: row.promotedUntil,
      categoryId: row.categoryId,
      bidCount: row.bidCount,
      hasExpertAppraisal: row.hasExpertAppraisal,
      images: row.images ?? [],
      createdAt: row.createdAt,
    };
  }

  private toCard(row: AuctionListRow, now: Date) {
    return {
      id: row.id,
      title: row.title,
      currentPrice: row.currentPrice,
      currency: row.currency,
      status: row.status,
      type: row.type,
      startsAt: row.startsAt?.toISOString() ?? null,
      endsAt: row.endsAt?.toISOString() ?? null,
      thumbnailUrl: row.images[0] ?? null,
      categoryId: row.categoryId,
      bidCount: row.bidCount,
      isLive: isLive(row, now),
      isPromoted: isPromoted(row, now),
      hasExpertAppraisal: row.hasExpertAppraisal,
    };
  }
}
