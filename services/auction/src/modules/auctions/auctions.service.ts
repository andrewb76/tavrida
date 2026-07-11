import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuctionEntity } from '../../entities/auction.entity';
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

@Injectable()
export class AuctionsService {
  constructor(
    @InjectRepository(AuctionEntity)
    private readonly auctions: Repository<AuctionEntity>,
  ) {}

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
