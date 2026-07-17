import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { DataSource, In, LessThanOrEqual, Repository } from 'typeorm';
import { AuctionEntity } from '../../entities/auction.entity';
import { BidEntity } from '../../entities/bid.entity';
import { ExpertAppraisalEntity } from '../../entities/expert-appraisal.entity';
import { AuctionEventsPublisher } from '../events/auction-events.publisher';
import { dropDutchAsk, minNextBid, validatePlaceBid } from './auction-bid.logic';
import { resolveClose } from './auction-close.logic';
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
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly events: AuctionEventsPublisher,
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
      winnerId: null,
      promotedUntil,
      images: (input.images ?? []).slice(0, input.maxImageCount ?? 8),
      bidCount: 0,
      hasExpertAppraisal: false,
    });

    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(AuctionEntity).save(row);
      await this.events.enqueueCreated(manager, {
        auctionId: row.id,
        sellerId: row.sellerId,
        categoryId: row.categoryId,
        type: row.type,
        startsAt: row.startsAt?.toISOString() ?? null,
        endsAt: row.endsAt?.toISOString() ?? null,
      });
    });
    this.events.flush();
    return this.toDetail(row);
  }

  async placeBid(input: { auctionId: string; bidderId: string; amount: number }) {
    const now = new Date();
    const result = await this.dataSource.transaction(async (manager) => {
      const auctions = manager.getRepository(AuctionEntity);
      const bids = manager.getRepository(BidEntity);
      const row = await auctions
        .createQueryBuilder('auction')
        .setLock('pessimistic_write')
        .where('auction.id = :id', { id: input.auctionId })
        .getOne();
      if (!row || row.status === 'DRAFT' || row.status === 'CANCELLED') {
        throw new NotFoundException({
          type: 'not-found',
          detail: `Auction ${input.auctionId} not found`,
        });
      }

      const check = validatePlaceBid({
        auction: {
          status: row.status,
          type: row.type,
          sellerId: row.sellerId,
          currentPrice: Number(row.currentPrice),
          bidIncrement: Number(row.bidIncrement),
          startsAt: row.startsAt,
          endsAt: row.endsAt,
        },
        bidderId: input.bidderId,
        amount: input.amount,
        now,
      });

      if (!check.ok) {
        throw new BadRequestException({ type: check.code, detail: check.detail });
      }

      if (check.activate) row.status = 'ACTIVE';
      await bids.update({ auctionId: row.id, isWinning: true }, { isWinning: false });

      const bid = bids.create({
        id: randomUUID(),
        auctionId: row.id,
        bidderId: input.bidderId,
        amount: String(input.amount),
        currency: row.currency,
        isWinning: true,
      });
      await bids.save(bid);

      row.currentPrice = String(input.amount);
      row.bidCount = (row.bidCount ?? 0) + 1;
      if (check.completeImmediately) {
        row.status = 'ENDED';
        row.winnerId = input.bidderId;
      }
      await auctions.save(row);
      const participantIds = await this.participantIds(row.id, row.sellerId, bids);
      await this.events.enqueueBidPlaced(manager, {
        auctionId: row.id,
        sellerId: row.sellerId,
        participantIds,
        bidId: bid.id,
        bidderId: bid.bidderId,
        amount: Number(bid.amount),
        currency: bid.currency,
        placedAt: bid.placedAt.toISOString(),
      });
      if (check.completeImmediately) {
        await this.events.enqueueCompleted(manager, {
          auctionId: row.id,
          sellerId: row.sellerId,
          buyerId: input.bidderId,
          participantIds,
          finalPrice: Number(bid.amount),
          currency: row.currency,
          completedAt: now.toISOString(),
        });
      }

      return {
        row,
        bid,
        completeImmediately: check.completeImmediately,
        participantIds,
      };
    });
    const { row, bid } = result;

    this.events.flush();

    return {
      bid: {
        id: bid.id,
        bidderId: bid.bidderId,
        amount: Number(bid.amount),
        currency: bid.currency,
        placedAt: bid.placedAt.toISOString(),
        isWinning: true,
      },
      auction: this.toDetail(row),
    };
  }

  async closeAuction(auctionId: string, now = new Date()) {
    const result = await this.dataSource.transaction(async (manager) => {
      const auctions = manager.getRepository(AuctionEntity);
      const bids = manager.getRepository(BidEntity);
      const row = await auctions
        .createQueryBuilder('auction')
        .setLock('pessimistic_write')
        .where('auction.id = :id', { id: auctionId })
        .getOne();
      if (!row) {
        throw new NotFoundException({ type: 'not-found', detail: `Auction ${auctionId} not found` });
      }
      if (row.status === 'ENDED' || row.status === 'CANCELLED') {
        return {
          response: { ...this.toDetail(row), alreadyClosed: true as const },
          completedEvent: null,
        };
      }
      if (row.status !== 'ACTIVE' && row.status !== 'SCHEDULED') {
        throw new BadRequestException({
          type: 'invalid_status',
          detail: `Cannot close auction in status ${row.status}`,
        });
      }

      if (
        row.status === 'SCHEDULED' &&
        row.startsAt &&
        row.startsAt.getTime() <= now.getTime() &&
        (!row.endsAt || row.endsAt.getTime() > now.getTime())
      ) {
        row.status = 'ACTIVE';
        await auctions.save(row);
        return {
          response: { ...this.toDetail(row), activatedOnly: true as const },
          completedEvent: null,
        };
      }

      const winning = await bids.findOne({
        where: { auctionId: row.id, isWinning: true },
      });
      const closed = resolveClose({
        currentPrice: Number(row.currentPrice),
        reservePrice: row.reservePrice != null ? Number(row.reservePrice) : null,
        winningBidderId: winning?.bidderId ?? null,
      });

      row.status = 'ENDED';
      row.winnerId = closed.winnerId;
      await auctions.save(row);
      const participantIds = await this.participantIds(row.id, row.sellerId, bids);
      const completedEvent = {
        auctionId: row.id,
        sellerId: row.sellerId,
        buyerId: closed.winnerId,
        participantIds,
        finalPrice: closed.finalPrice,
        currency: row.currency,
        completedAt: now.toISOString(),
      };
      await this.events.enqueueCompleted(manager, completedEvent);

      return {
        response: {
          ...this.toDetail(row),
          sold: closed.sold,
          alreadyClosed: false as const,
        },
        completedEvent,
      };
    });

    if (result.completedEvent) this.events.flush();
    return result.response;
  }

  /** Activate due SCHEDULED + Dutch ask step-down + close due ACTIVE (endsAt <= now). */
  async runCloseDue(now = new Date()) {
    const lock = this.dataSource.createQueryRunner();
    await lock.connect();
    try {
      const [{ acquired }] = (await lock.query(
        'SELECT pg_try_advisory_lock(hashtext($1)) AS acquired',
        ['auction.run-close-due'],
      )) as Array<{ acquired: boolean }>;
      if (!acquired) {
        return {
          scanned: 0,
          activated: 0,
          dutchDropped: 0,
          closed: 0,
          results: [],
          skippedConcurrent: true as const,
        };
      }

      try {
        return await this.runCloseDueLocked(now);
      } finally {
        await lock.query('SELECT pg_advisory_unlock(hashtext($1))', ['auction.run-close-due']);
      }
    } finally {
      await lock.release();
    }
  }

  private async runCloseDueLocked(now: Date) {
    let closed = 0;
    const results: Array<{ auctionId: string; sold: boolean; winnerId: string | null }> = [];
    const recordClose = (
      auctionId: string,
      result: Awaited<ReturnType<AuctionsService['closeAuction']>>,
    ) => {
      const alreadyClosed = 'alreadyClosed' in result && result.alreadyClosed;
      const activatedOnly = 'activatedOnly' in result && result.activatedOnly;
      if (activatedOnly || alreadyClosed) return;
      closed += 1;
      results.push({
        auctionId,
        sold: 'sold' in result ? Boolean(result.sold) : false,
        winnerId: 'winnerId' in result ? (result.winnerId as string | null) : null,
      });
    };

    const toActivate = await this.auctions.find({
      where: {
        status: 'SCHEDULED',
        startsAt: LessThanOrEqual(now),
      },
    });
    let activated = 0;
    for (const row of toActivate) {
      const result = await this.closeAuction(row.id, now);
      if ('activatedOnly' in result && result.activatedOnly) activated += 1;
      else recordClose(row.id, result);
    }

    const dutchLive = await this.auctions.find({
      where: { status: 'ACTIVE', type: 'DUTCH' },
    });
    let dutchDropped = 0;
    for (const row of dutchLive) {
      if (await this.dropDutchAskIfLive(row.id, now)) dutchDropped += 1;
    }

    const toClose = await this.auctions.find({
      where: {
        status: 'ACTIVE',
        endsAt: LessThanOrEqual(now),
      },
    });
    for (const row of toClose) {
      recordClose(row.id, await this.closeAuction(row.id, now));
    }

    return {
      scanned: toActivate.length + dutchLive.length + toClose.length,
      activated,
      dutchDropped,
      closed,
      results,
    };
  }

  private async dropDutchAskIfLive(auctionId: string, now: Date): Promise<boolean> {
    return this.dataSource.transaction(async (manager) => {
      const auctions = manager.getRepository(AuctionEntity);
      const row = await auctions
        .createQueryBuilder('auction')
        .setLock('pessimistic_write')
        .where('auction.id = :id', { id: auctionId })
        .getOne();
      if (
        !row ||
        row.status !== 'ACTIVE' ||
        row.type !== 'DUTCH' ||
        (row.endsAt && row.endsAt.getTime() <= now.getTime())
      ) {
        return false;
      }

      const drop = dropDutchAsk(
        Number(row.currentPrice),
        Number(row.bidIncrement),
        row.reservePrice != null ? Number(row.reservePrice) : null,
      );
      if (!drop.dropped) return false;
      row.currentPrice = String(drop.nextPrice);
      await auctions.save(row);
      return true;
    });
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

  private async participantIds(
    auctionId: string,
    sellerId: string,
    bids: Repository<BidEntity> = this.bids,
  ): Promise<string[]> {
    const bidderRows = await bids.find({
      where: { auctionId },
      select: ['bidderId'],
    });
    const set = new Set<string>([sellerId]);
    for (const b of bidderRows) set.add(b.bidderId);
    return [...set];
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
      winnerId: row.winnerId,
      promotedUntil: row.promotedUntil?.toISOString() ?? null,
      reservePrice: row.reservePrice != null ? Number(row.reservePrice) : null,
      images: row.images ?? [],
      bidCount: row.bidCount,
      hasExpertAppraisal: row.hasExpertAppraisal,
      isLive: isLive(listRow, now),
      isPromoted: isPromoted(listRow, now),
      minNextBid: minNextBid(currentPrice, bidIncrement, row.type),
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
      where: {
        status: In(['ACTIVE', 'SCHEDULED', 'ENDED']),
      },
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
