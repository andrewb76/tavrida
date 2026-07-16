import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import amqp, { type Channel, type ChannelModel } from 'amqplib';
import {
  DOMAIN_EVENTS_EXCHANGE,
  createDomainEvent,
  type DomainEventEnvelope,
} from '../../common/domain-events';

@Injectable()
export class AuctionEventsPublisher implements OnModuleDestroy {
  private readonly logger = new Logger(AuctionEventsPublisher.name);
  private conn: ChannelModel | null = null;
  private channel: Channel | null = null;
  private connecting: Promise<Channel | null> | null = null;

  constructor(private readonly config: ConfigService) {}

  async onModuleDestroy() {
    try {
      await this.channel?.close();
      await this.conn?.close();
    } catch {
      /* ignore */
    }
  }

  publishCreated(payload: {
    auctionId: string;
    sellerId: string;
    categoryId: string | null;
    type: string;
    startsAt: string | null;
    endsAt: string | null;
  }) {
    return this.publish(
      createDomainEvent({
        eventType: 'auction.created',
        producer: 'auction',
        payload,
        correlationId: payload.auctionId,
      }),
    );
  }

  publishBidPlaced(payload: {
    auctionId: string;
    sellerId: string;
    participantIds: string[];
    bidId: string;
    bidderId: string;
    amount: number;
    currency: string;
    placedAt: string;
  }) {
    return this.publish(
      createDomainEvent({
        eventType: 'auction.bid_placed',
        producer: 'auction',
        payload,
        correlationId: payload.auctionId,
      }),
    );
  }

  publishCompleted(payload: {
    auctionId: string;
    sellerId: string;
    buyerId: string | null;
    participantIds: string[];
    finalPrice: number;
    currency: string;
    completedAt: string;
  }) {
    return this.publish(
      createDomainEvent({
        eventType: 'auction.completed',
        producer: 'auction',
        payload,
        correlationId: payload.auctionId,
      }),
    );
  }

  private async publish(envelope: DomainEventEnvelope) {
    const ch = await this.ensureChannel();
    if (!ch) {
      this.logger.warn(`Skip publish ${envelope.eventType}: RABBITMQ_URL unavailable`);
      return { published: false as const, eventId: envelope.eventId };
    }

    const body = Buffer.from(JSON.stringify(envelope));
    ch.publish(DOMAIN_EVENTS_EXCHANGE, envelope.eventType, body, {
      contentType: 'application/json',
      messageId: envelope.eventId,
      type: envelope.eventType,
      persistent: true,
    });
    this.logger.log(`Published ${envelope.eventType} ${envelope.eventId}`);
    return { published: true as const, eventId: envelope.eventId };
  }

  private ensureChannel(): Promise<Channel | null> {
    if (this.channel) return Promise.resolve(this.channel);
    if (this.connecting) return this.connecting;

    this.connecting = (async () => {
      const url = this.config.get<string>('RABBITMQ_URL')?.trim();
      if (!url) {
        this.logger.warn('RABBITMQ_URL not set — auction events disabled');
        return null;
      }
      try {
        const conn = await amqp.connect(url);
        const ch = await conn.createChannel();
        await ch.assertExchange(DOMAIN_EVENTS_EXCHANGE, 'topic', { durable: true });
        this.conn = conn;
        this.channel = ch;
        conn.on('close', () => {
          this.conn = null;
          this.channel = null;
          this.connecting = null;
        });
        return ch;
      } catch (err) {
        this.logger.warn(`RabbitMQ connect failed: ${String(err)}`);
        this.connecting = null;
        return null;
      }
    })();

    return this.connecting;
  }
}
