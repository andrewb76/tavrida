import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, MoreThanOrEqual, Repository } from 'typeorm';
import {
  ORDER_TRANSITIONS,
  type OrderStatus,
} from '../../common/marketplace.types';
import { ServiceListingEntity } from '../../entities/service-listing.entity';
import { ServiceOrderEntity } from '../../entities/service-order.entity';
import { MarketplaceEventsPublisher } from '../events/marketplace-events.publisher';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(ServiceOrderEntity)
    private readonly orders: Repository<ServiceOrderEntity>,
    @InjectRepository(ServiceListingEntity)
    private readonly listings: Repository<ServiceListingEntity>,
    private readonly events: MarketplaceEventsPublisher,
    private readonly dataSource: DataSource,
  ) {}

  async countCustomerOrdersThisMonth(customerId: string) {
    const start = new Date();
    start.setUTCDate(1);
    start.setUTCHours(0, 0, 0, 0);
    return this.orders.count({
      where: { customerId, createdAt: MoreThanOrEqual(start) },
    });
  }

  async list(userId: string, role: 'provider' | 'customer') {
    const where = role === 'provider' ? { providerId: userId } : { customerId: userId };
    const rows = await this.orders.find({ where, order: { createdAt: 'DESC' } });
    return { data: rows.map((r) => this.toOrder(r)) };
  }

  async get(id: string, userId: string) {
    const row = await this.orders.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Order not found');
    if (row.providerId !== userId && row.customerId !== userId) {
      throw new ForbiddenException('Not your order');
    }
    return this.toOrder(row);
  }

  async create(input: { listingId: string; customerId: string; note?: string }) {
    const listing = await this.listings.findOne({ where: { id: input.listingId } });
    if (!listing || listing.status !== 'ACTIVE') {
      throw new BadRequestException('Listing is not available for order');
    }
    if (listing.providerId === input.customerId) {
      throw new BadRequestException('Cannot order your own listing');
    }

    const row = this.orders.create({
      listingId: listing.id,
      providerId: listing.providerId,
      customerId: input.customerId,
      agreedPrice: listing.price,
      currency: listing.currency,
      status: 'PENDING',
      note: input.note?.trim() ?? null,
      completedAt: null,
    });
    return this.toOrder(await this.orders.save(row));
  }

  async updateStatus(id: string, userId: string, status: OrderStatus) {
    const order = await this.dataSource.transaction(async (manager) => {
      const orders = manager.getRepository(ServiceOrderEntity);
      const row = await orders
        .createQueryBuilder('order')
        .setLock('pessimistic_write')
        .where('order.id = :id', { id })
        .getOne();
      if (!row) throw new NotFoundException('Order not found');

      const allowed = ORDER_TRANSITIONS[row.status] ?? [];
      if (!allowed.includes(status)) {
        throw new BadRequestException(`Cannot transition ${row.status} → ${status}`);
      }

      if (status === 'CANCELLED') {
        if (row.providerId !== userId && row.customerId !== userId) {
          throw new ForbiddenException('Not your order');
        }
      } else if (row.providerId !== userId) {
        throw new ForbiddenException('Only provider can change this status');
      }

      row.status = status;
      if (status === 'COMPLETED') row.completedAt = new Date();
      const saved = await orders.save(row);
      const result = this.toOrder(saved);

      if (status === 'COMPLETED') {
        await this.events.enqueueOrderCompleted(manager, {
          orderId: result.id,
          listingId: result.listingId,
          providerId: result.providerId,
          customerId: result.customerId,
          price: result.agreedPrice,
          currency: result.currency,
          completedAt: result.completedAt ?? new Date().toISOString(),
        });
      } else if (status === 'CANCELLED') {
        await this.events.enqueueOrderCancelled(manager, {
          orderId: result.id,
          providerId: result.providerId,
          customerId: result.customerId,
          reason: 'user_cancelled',
          cancelledAt: new Date().toISOString(),
        });
      }
      return result;
    });

    this.events.flush();
    return order;
  }

  private toOrder(row: ServiceOrderEntity) {
    return {
      id: row.id,
      listingId: row.listingId,
      providerId: row.providerId,
      customerId: row.customerId,
      agreedPrice: Number(row.agreedPrice),
      currency: row.currency,
      status: row.status,
      note: row.note,
      completedAt: row.completedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
