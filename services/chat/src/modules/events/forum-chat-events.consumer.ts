import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import amqp, {
  type ChannelModel,
  type ConfirmChannel,
  type ConsumeMessage,
} from 'amqplib';
import { ChatsService } from '../chats/chats.service';

const EXCHANGE = 'tavrida-lot.events';
const QUEUE = 'chat.forum-events';
const DEAD_QUEUE = `${QUEUE}.dlq`;
const MAX_RETRIES = 5;
const ROUTING_KEYS = ['forum.topic_published', 'forum.comment_created'] as const;

type Envelope = {
  eventId: string;
  eventType: string;
  payload: Record<string, unknown>;
};

@Injectable()
export class ForumChatEventsConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ForumChatEventsConsumer.name);
  private conn: ChannelModel | null = null;
  private channel: ConfirmChannel | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly chats: ChatsService,
  ) {}

  async onModuleInit() {
    const url = this.config.get<string>('RABBITMQ_URL')?.trim();
    if (!url) {
      this.logger.warn('RABBITMQ_URL not set — forum TOPIC chat consumer disabled');
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
      if (envelope.eventType === 'forum.topic_published') {
        const p = envelope.payload as { topicId?: string; authorId?: string };
        if (p.topicId && p.authorId) {
          await this.chats.ensureTopic(p.topicId, p.authorId);
          this.logger.debug(`TOPIC ensured for topic ${p.topicId} (author)`);
        }
      } else if (envelope.eventType === 'forum.comment_created') {
        const p = envelope.payload as { topicId?: string; authorId?: string };
        if (p.topicId && p.authorId) {
          await this.chats.ensureTopic(p.topicId, p.authorId);
          this.logger.debug(`TOPIC member joined via comment on ${p.topicId}`);
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
