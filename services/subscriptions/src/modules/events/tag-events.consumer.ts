import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import amqp, {
  type ChannelModel,
  type ConfirmChannel,
  type ConsumeMessage,
} from 'amqplib';
import { filterEligibleUserIds } from '../../common/delivery-filter';
import { NotificationsClient } from '../notifications/notifications.client';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

const EXCHANGE = 'tavrida-lot.events';
const QUEUE = 'subscriptions.events';
const DEAD_QUEUE = `${QUEUE}.dlq`;
const MAX_RETRIES = 5;
const ROUTING_KEYS = ['tag.content_tagged'] as const;

type Envelope = {
  eventId: string;
  eventType: string;
  payload: Record<string, unknown>;
};

type TagContentTaggedPayload = {
  tagId?: string;
  topicId?: string;
  contentType?: 'topic' | 'comment';
  contentId?: string;
  excludeUserIds?: string[];
};

@Injectable()
export class TagEventsConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TagEventsConsumer.name);
  private conn: ChannelModel | null = null;
  private channel: ConfirmChannel | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly subscriptions: SubscriptionsService,
    private readonly notifications: NotificationsClient,
  ) {}

  async onModuleInit() {
    const url = this.config.get<string>('RABBITMQ_URL')?.trim();
    if (!url) {
      this.logger.warn('RABBITMQ_URL not set — tag.content_tagged consumer disabled');
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
      if (envelope.eventType === 'tag.content_tagged') {
        await this.handleTagContentTagged(envelope.payload as TagContentTaggedPayload);
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

  async handleTagContentTagged(payload: TagContentTaggedPayload): Promise<{
    matched: number;
    notified: number;
  }> {
    const tagId = payload.tagId?.trim();
    const contentId = payload.contentId?.trim();
    const topicId = payload.topicId?.trim() ?? contentId;
    const contentType = payload.contentType === 'comment' ? 'comment' : 'topic';
    if (!tagId || !contentId || !topicId) {
      this.logger.warn('tag.content_tagged missing tagId/contentId — skip');
      return { matched: 0, notified: 0 };
    }

    const { userIds } = await this.subscriptions.match('tag.content_tagged', { tagId });
    const prefsByUserId = new Map<string, { pushEnabled: boolean; quietHours: null | { start: string; end: string; tz: string } }>();
    for (const userId of userIds) {
      try {
        const pref = await this.subscriptions.getDeliveryPreference(userId);
        prefsByUserId.set(userId, {
          pushEnabled: pref.pushEnabled,
          quietHours: pref.quietHours,
        });
      } catch {
        /* fail-open via missing pref */
      }
    }

    const eligible = filterEligibleUserIds({
      matchedUserIds: userIds,
      excludeUserIds: payload.excludeUserIds,
      prefsByUserId,
    });

    let notified = 0;
    for (const userId of eligible) {
      const ok = await this.notifications.trigger({
        userId,
        workflowId: 'tag-content',
        idempotencyKey: `tag-content:${contentId}:${userId}`,
        payload: {
          topicId,
          contentType,
          contentId,
          tagIds: [tagId],
        },
      });
      if (ok) notified += 1;
    }

    if (userIds.length) {
      this.logger.log(
        `tag.content_tagged tag=${tagId} content=${contentId} matched=${userIds.length} ` +
          `eligible=${eligible.length} notified=${notified}`,
      );
    }
    return { matched: userIds.length, notified };
  }
}
