import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import amqp, { type Channel, type ChannelModel } from 'amqplib';
import {
  DOMAIN_EVENTS_EXCHANGE,
  createDomainEvent,
  type DomainEventEnvelope,
  type TagContentTaggedPayload,
} from './domain-events';

@Injectable()
export class TagEventsPublisher implements OnModuleDestroy {
  private readonly logger = new Logger(TagEventsPublisher.name);
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

  /** @returns true if all events were published to RMQ. */
  async publishTagContentTagged(input: {
    tagIds: string[];
    topicId: string;
    contentType: 'topic' | 'comment';
    contentId: string;
    excludeUserIds?: string[];
  }): Promise<boolean> {
    if (!input.tagIds.length) return true;
    let allPublished = true;
    for (const tagId of input.tagIds) {
      const payload: TagContentTaggedPayload = {
        tagId,
        topicId: input.topicId,
        contentType: input.contentType,
        contentId: input.contentId,
        excludeUserIds: input.excludeUserIds,
      };
      const result = await this.publish(
        createDomainEvent({
          eventType: 'tag.content_tagged',
          producer: 'bff',
          payload,
          correlationId: input.contentId,
        }),
      );
      if (!result.published) allPublished = false;
    }
    return allPublished;
  }

  private async publish(envelope: DomainEventEnvelope) {
    const ch = await this.ensureChannel();
    if (!ch) {
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

  private async ensureChannel(): Promise<Channel | null> {
    if (this.channel) return this.channel;
    if (this.connecting) return this.connecting;

    const url = this.config.get<string>('RABBITMQ_URL')?.trim();
    if (!url) return null;

    this.connecting = (async () => {
      try {
        const conn = await amqp.connect(url);
        const ch = await conn.createChannel();
        await ch.assertExchange(DOMAIN_EVENTS_EXCHANGE, 'topic', { durable: true });
        this.conn = conn;
        this.channel = ch;
        conn.on('close', () => {
          this.conn = null;
          this.channel = null;
        });
        return ch;
      } catch (err) {
        this.logger.warn(`RabbitMQ publish unavailable: ${String(err)}`);
        return null;
      } finally {
        this.connecting = null;
      }
    })();

    return this.connecting;
  }
}
