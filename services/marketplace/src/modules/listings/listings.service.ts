import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  LISTING_STATUSES,
  MARKETPLACE_LIMIT_KEYS,
  type ListingCategory,
  type ListingStatus,
} from '../../common/marketplace.types';
import { PortfolioItemEntity } from '../../entities/portfolio-item.entity';
import { ServiceListingEntity } from '../../entities/service-listing.entity';

@Injectable()
export class ListingsService {
  constructor(
    @InjectRepository(ServiceListingEntity)
    private readonly listings: Repository<ServiceListingEntity>,
    @InjectRepository(PortfolioItemEntity)
    private readonly portfolio: Repository<PortfolioItemEntity>,
  ) {}

  limitKeys() {
    return MARKETPLACE_LIMIT_KEYS;
  }

  async countActiveByProvider(providerId: string) {
    return this.listings.count({ where: { providerId, status: 'ACTIVE' } });
  }

  async countPortfolio(listingId: string) {
    return this.portfolio.count({ where: { listingId } });
  }

  async list(query: {
    category?: string;
    providerId?: string;
    status?: ListingStatus;
    mineProviderId?: string;
  }) {
    const qb = this.listings.createQueryBuilder('l').orderBy('l.createdAt', 'DESC');

    if (query.mineProviderId) {
      qb.andWhere('l.providerId = :providerId', { providerId: query.mineProviderId });
      if (query.status) qb.andWhere('l.status = :status', { status: query.status });
    } else {
      qb.andWhere('l.status = :status', { status: query.status ?? 'ACTIVE' });
      if (query.providerId) {
        qb.andWhere('l.providerId = :providerId', { providerId: query.providerId });
      }
    }

    if (query.category) {
      qb.andWhere('l.category = :category', { category: query.category });
    }

    const rows = await qb.getMany();
    return { data: rows.map((r) => this.toListing(r)) };
  }

  async get(id: string, opts?: { includeDraftFor?: string }) {
    const row = await this.listings.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Listing not found');
    if (
      row.status !== 'ACTIVE' &&
      row.status !== 'PAUSED' &&
      opts?.includeDraftFor !== row.providerId
    ) {
      if (row.status === 'DRAFT' || row.status === 'ARCHIVED') {
        if (opts?.includeDraftFor !== row.providerId) {
          throw new NotFoundException('Listing not found');
        }
      }
    }
    const items = await this.portfolio.find({
      where: { listingId: id },
      order: { sortOrder: 'ASC' },
    });
    return {
      ...this.toListing(row),
      portfolio: items.map((p) => this.toPortfolio(p)),
    };
  }

  async create(input: {
    providerId: string;
    title: string;
    description?: string;
    price: number;
    currency?: string;
    category?: ListingCategory | null;
    status?: ListingStatus;
  }) {
    const status = input.status ?? 'DRAFT';
    if (!LISTING_STATUSES.includes(status)) {
      throw new BadRequestException('Invalid status');
    }
    if (!(input.price >= 0)) throw new BadRequestException('price must be >= 0');

    const row = this.listings.create({
      providerId: input.providerId,
      title: input.title.trim(),
      description: input.description?.trim() ?? '',
      price: String(input.price),
      currency: input.currency ?? 'RUB',
      category: input.category ?? null,
      status,
    });
    const saved = await this.listings.save(row);
    return this.toListing(saved);
  }

  async update(
    id: string,
    providerId: string,
    patch: {
      title?: string;
      description?: string;
      price?: number;
      category?: ListingCategory | null;
      status?: ListingStatus;
    },
  ) {
    const row = await this.listings.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Listing not found');
    if (row.providerId !== providerId) throw new ForbiddenException('Not your listing');

    if (patch.title !== undefined) row.title = patch.title.trim();
    if (patch.description !== undefined) row.description = patch.description.trim();
    if (patch.price !== undefined) {
      if (!(patch.price >= 0)) throw new BadRequestException('price must be >= 0');
      row.price = String(patch.price);
    }
    if (patch.category !== undefined) row.category = patch.category;
    if (patch.status !== undefined) {
      if (!LISTING_STATUSES.includes(patch.status)) {
        throw new BadRequestException('Invalid status');
      }
      row.status = patch.status;
    }
    return this.toListing(await this.listings.save(row));
  }

  async remove(id: string, providerId: string) {
    const row = await this.listings.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Listing not found');
    if (row.providerId !== providerId) throw new ForbiddenException('Not your listing');
    await this.portfolio.delete({ listingId: id });
    await this.listings.remove(row);
    return { ok: true as const };
  }

  async addPortfolio(
    listingId: string,
    providerId: string,
    input: { title: string; description?: string; imageUrl: string; sortOrder?: number },
  ) {
    const listing = await this.listings.findOne({ where: { id: listingId } });
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.providerId !== providerId) throw new ForbiddenException('Not your listing');

    const count = await this.portfolio.count({ where: { listingId } });
    const row = this.portfolio.create({
      listingId,
      title: input.title.trim(),
      description: input.description?.trim() ?? null,
      imageUrl: input.imageUrl.trim(),
      sortOrder: input.sortOrder ?? count,
    });
    return this.toPortfolio(await this.portfolio.save(row));
  }

  async removePortfolio(listingId: string, itemId: string, providerId: string) {
    const listing = await this.listings.findOne({ where: { id: listingId } });
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.providerId !== providerId) throw new ForbiddenException('Not your listing');
    const item = await this.portfolio.findOne({ where: { id: itemId, listingId } });
    if (!item) throw new NotFoundException('Portfolio item not found');
    await this.portfolio.remove(item);
    return { ok: true as const };
  }

  private toListing(row: ServiceListingEntity) {
    return {
      id: row.id,
      providerId: row.providerId,
      title: row.title,
      description: row.description,
      price: Number(row.price),
      currency: row.currency,
      category: row.category,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toPortfolio(row: PortfolioItemEntity) {
    return {
      id: row.id,
      listingId: row.listingId,
      title: row.title,
      description: row.description,
      imageUrl: row.imageUrl,
      sortOrder: row.sortOrder,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
