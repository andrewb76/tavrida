import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import amqp, {
  type ChannelModel,
  type ConfirmChannel,
  type ConsumeMessage,
} from 'amqplib';
import { FeedbackService } from '../feedback/feedback.service';

const EXCHANGE = 'tavrida-lot.events';
const QUEUE = 'deal-feedback.events';
const DEAD_QUEUE = `${QUEUE}.dlq`;
const MAX_RETRIES = 5;
const ROUTING_KEYS = ['marketplace.order_completed', 'auction.completed'] as const;

type Envelope = {
  eventId: string;
  eventType: string;
  payload: Record<string, unknown>;
};

@Injectable()
export class DealFeedbackEventsConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DealFeedbackEventsConsumer.name);
  private conn: ChannelModel | null = null;
  private channel: ConfirmChannel | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly feedback: FeedbackService,
  ) {}

  async onModuleInit() {
    const url = this.config.get<string>('RABBITMQ_URL')?.trim();
    if (!url) {
      this.logger.warn('RABBITMQ_URL not set — deal-feedback consumer disabled');
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
      await ch.prefetch(10);
      await ch.consume(QUEUE, (msg) => {
        void this.onMessage(msg);
      });
      this.conn = conn;
      this.channel = ch;
      this.logger.log(`Consuming ${QUEUE} ← ${ROUTING_KEYS.join(', ')}`);
    } catch (err) {
      this.logger.warn(`RabbitMQ consumer failed to start: ${String(err)}`);
    }
  }

  async onModuleDestroy() {
    try {
      await this.channel?.close();
      await this.conn?.close();
    } catch {
      /* ignore */
    }
  }

  private async onMessage(msg: ConsumeMessage | null) {
    if (!msg || !this.channel) return;
    try {
      const envelope = JSON.parse(msg.content.toString('utf8')) as Envelope;
      if (envelope.eventType === 'marketplace.order_completed') {
        const p = envelope.payload as {
          orderId?: string;
          providerId?: string;
          customerId?: string;
        };
        if (p.orderId && p.providerId && p.customerId) {
          await this.feedback.handleOrderCompleted(envelope.eventId, {
            orderId: p.orderId,
            providerId: p.providerId,
            customerId: p.customerId,
          });
        }
      } else if (envelope.eventType === 'auction.completed') {
        const p = envelope.payload as {
          auctionId?: string;
          sellerId?: string;
          buyerId?: string | null;
        };
        if (p.auctionId && p.sellerId && p.buyerId) {
          await this.feedback.handleAuctionCompleted(envelope.eventId, {
            auctionId: p.auctionId,
            sellerId: p.sellerId,
            buyerId: p.buyerId,
          });
        }
      }
      this.channel.ack(msg);
    } catch (err) {
      this.logger.warn(`Failed to process message: ${String(err)}`);
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
      void (async () => {
        try {
          if (attempt > MAX_RETRIES) {
            channel.sendToQueue(DEAD_QUEUE, msg.content, {
              ...msg.properties,
              persistent: true,
              headers: {
                ...msg.properties.headers,
                'x-retry-count': attempt - 1,
                'x-last-error': detail.slice(0, 1_000),
              },
            });
          } else {
            channel.publish(EXCHANGE, msg.fields.routingKey, msg.content, {
              ...msg.properties,
              persistent: true,
              headers: {
                ...msg.properties.headers,
                'x-retry-count': attempt,
              },
            });
          }
          await channel.waitForConfirms();
          channel.ack(msg);
        } catch (retryError) {
          this.logger.warn(`Failed to schedule event retry: ${String(retryError)}`);
          channel.nack(msg, false, true);
        }
      })();
    }, delayMs).unref();
  }
}
