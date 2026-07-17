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
export class MarketplaceEventsPublisher implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MarketplaceEventsPublisher.name);
  private readonly relay: OutboxRelay;

  constructor(config: ConfigService, dataSource: DataSource) {
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

  enqueueOrderCompleted(manager: EntityManager, payload: {
    orderId: string;
    listingId: string;
    providerId: string;
    customerId: string;
    price: number;
    currency: string;
    completedAt: string;
  }) {
    return enqueueDomainEvent(manager, {
      eventType: 'marketplace.order_completed',
      producer: 'marketplace',
      payload,
      correlationId: payload.orderId,
    });
  }

  enqueueOrderCancelled(manager: EntityManager, payload: {
    orderId: string;
    providerId: string;
    customerId: string;
    reason: string;
    cancelledAt: string;
  }) {
    return enqueueDomainEvent(manager, {
      eventType: 'marketplace.order_cancelled',
      producer: 'marketplace',
      payload,
      correlationId: payload.orderId,
    });
  }
}
