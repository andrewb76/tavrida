import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  enqueueDomainEvent,
  OutboxRelay,
} from '@tavrida/outbox';
import { DataSource, type EntityManager } from 'typeorm';

@Injectable()
export class AuctionEventsPublisher implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AuctionEventsPublisher.name);
  private readonly relay: OutboxRelay;

  constructor(
    config: ConfigService,
    dataSource: DataSource,
  ) {
    this.relay = new OutboxRelay(dataSource, {
      rabbitmqUrl: config.get<string>('RABBITMQ_URL'),
      logger: this.logger,
    });
  }

  onModuleInit(): void {
    this.relay.start();
  }

  onModuleDestroy(): Promise<void> {
    return this.relay.stop();
  }

  flush(): void {
    void this.relay.flush();
  }

  enqueueCreated(manager: EntityManager, payload: {
    auctionId: string;
    sellerId: string;
    categoryId: string | null;
    type: string;
    startsAt: string | null;
    endsAt: string | null;
  }) {
    return enqueueDomainEvent(manager, {
      eventType: 'auction.created',
      producer: 'auction',
      payload,
      correlationId: payload.auctionId,
    });
  }

  enqueueBidPlaced(manager: EntityManager, payload: {
    auctionId: string;
    sellerId: string;
    participantIds: string[];
    bidId: string;
    bidderId: string;
    amount: number;
    currency: string;
    placedAt: string;
  }) {
    return enqueueDomainEvent(manager, {
      eventType: 'auction.bid_placed',
      producer: 'auction',
      payload,
      correlationId: payload.auctionId,
    });
  }

  enqueueCompleted(manager: EntityManager, payload: {
    auctionId: string;
    sellerId: string;
    buyerId: string | null;
    participantIds: string[];
    finalPrice: number;
    currency: string;
    completedAt: string;
  }) {
    return enqueueDomainEvent(manager, {
      eventType: 'auction.completed',
      producer: 'auction',
      payload,
      correlationId: payload.auctionId,
    });
  }
}
