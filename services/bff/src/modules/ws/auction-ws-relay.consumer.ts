import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import amqp, {
  type ChannelModel,
  type ConfirmChannel,
  type ConsumeMessage,
} from 'amqplib';
import { WsHubService } from './ws-hub.service';

const EXCHANGE = 'tavrida-lot.events';
const QUEUE = 'bff.auction-ws';
const DEAD_QUEUE = `${QUEUE}.dlq`;
const MAX_RETRIES = 5;
const ROUTING_KEYS = ['auction.bid_placed', 'auction.completed'] as const;

type Envelope = {
  eventId: string;
  eventType: string;
  payload: Record<string, unknown>;
};

@Injectable()
export class AuctionWsRelayConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AuctionWsRelayConsumer.name);
  private conn: ChannelModel | null = null;
  private channel: ConfirmChannel | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly hub: WsHubService,
  ) {}

  async onModuleInit() {
    const url = this.config.get<string>('RABBITMQ_URL')?.trim();
    if (!url) {
      this.logger.warn('RABBITMQ_URL not set — auction WS relay disabled');
      return;
    }
    try {
      const conn = await amqp.connect(url);
      const ch = await conn.createConfirmChannel();
      await ch.assertExchange(EXCHANGE, 'topic', { durable: true });
      await ch.assertQueue(QUEUE, { durable: true });
      await ch.assertQueue(DEAD_QUEUE, { durable: true });
      for (const key of ROUTING_KEYS) {
        await ch.bindQueue(QUEUE, EXCHANGE, key);
      }
      await ch.prefetch(20);
      await ch.consume(QUEUE, (msg) => {
        void this.onMessage(msg);
      });
      this.conn = conn;
      this.channel = ch;
      this.logger.log(`Consuming ${QUEUE} ← ${ROUTING_KEYS.join(', ')}`);
    } catch (err) {
      this.logger.warn(`Auction WS relay failed to start: ${String(err)}`);
    }
  }

  async onModuleDestroy() {
    try {
      await this.channel?.close();
    } catch {
      /* ignore */
    }
    try {
      await this.conn?.close();
    } catch {
      /* ignore */
    }
  }

  private async onMessage(msg: ConsumeMessage | null) {
    if (!msg || !this.channel) return;
    try {
      const envelope = JSON.parse(msg.content.toString('utf8')) as Envelope;
      const mapped = mapAuctionEvent(envelope);
      if (mapped) {
        this.hub.publish(mapped.channel, mapped.event, mapped.payload);
      }
      this.channel.ack(msg);
    } catch (err) {
      this.logger.warn(`Failed to relay auction event: ${String(err)}`);
      this.scheduleRetry(msg, err);
    }
  }

  private scheduleRetry(msg: ConsumeMessage, error: unknown): void {
    const channel = this.channel;
    if (!channel) return;
    const attempt = Number(msg.properties.headers?.['x-retry-count'] ?? 0) + 1;
    const detail = error instanceof Error ? error.message : String(error);
    const delayMs = Math.min(1_000 * 2 ** (attempt - 1), 30_000);

    setTimeout(() => {
      try {
        if (attempt >= MAX_RETRIES) {
          channel.sendToQueue(
            DEAD_QUEUE,
            msg.content,
            {
              persistent: true,
              headers: {
                ...(msg.properties.headers ?? {}),
                'x-retry-count': attempt,
                'x-last-error': detail.slice(0, 500),
              },
            },
            (err) => {
              if (err) channel.nack(msg, false, true);
              else channel.ack(msg);
            },
          );
          return;
        }
        channel.publish(
          EXCHANGE,
          msg.fields.routingKey,
          msg.content,
          {
            persistent: true,
            headers: {
              ...(msg.properties.headers ?? {}),
              'x-retry-count': attempt,
              'x-last-error': detail.slice(0, 500),
            },
          },
          (err) => {
            if (err) channel.nack(msg, false, true);
            else channel.ack(msg);
          },
        );
      } catch {
        channel.nack(msg, false, true);
      }
    }, delayMs);
  }
}

export function mapAuctionEvent(envelope: Envelope): {
  channel: string;
  event: string;
  payload: Record<string, unknown>;
} | null {
  const p = envelope.payload;
  const auctionId = typeof p.auctionId === 'string' ? p.auctionId : null;
  if (!auctionId) return null;

  if (envelope.eventType === 'auction.bid_placed') {
    return {
      channel: `auction:${auctionId}`,
      event: 'bid.placed',
      payload: {
        auctionId,
        bidId: p.bidId,
        bidderId: p.bidderId,
        amount: p.amount,
        currency: p.currency ?? 'RUB',
        placedAt: p.placedAt,
        sellerId: p.sellerId,
      },
    };
  }

  if (envelope.eventType === 'auction.completed') {
    return {
      channel: `auction:${auctionId}`,
      event: 'auction.ended',
      payload: {
        auctionId,
        sellerId: p.sellerId,
        buyerId: p.buyerId ?? null,
        finalPrice: p.finalPrice,
        currency: p.currency ?? 'RUB',
        completedAt: p.completedAt,
      },
    };
  }

  return null;
}
