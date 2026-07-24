import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import amqp, {
  type ChannelModel,
  type ConfirmChannel,
  type ConsumeMessage,
} from 'amqplib';
import { MediaService } from '../media/media.service';
import { UserProfileClient } from '../user-profile/user-profile.client';
import { WsHubService } from './ws-hub.service';

const EXCHANGE = 'tavrida-lot.events';
const QUEUE = 'bff.chat-ws';
const DEAD_QUEUE = `${QUEUE}.dlq`;
const MAX_RETRIES = 5;
const ROUTING_KEYS = [
  'chat.message_created',
  'chat.message_edited',
  'chat.message_deleted',
  'chat.message_read',
] as const;

type Envelope = {
  eventId: string;
  eventType: string;
  payload: Record<string, unknown>;
};

@Injectable()
export class ChatWsRelayConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ChatWsRelayConsumer.name);
  private conn: ChannelModel | null = null;
  private channel: ConfirmChannel | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly hub: WsHubService,
    private readonly media: MediaService,
    private readonly users: UserProfileClient,
  ) {}

  async onModuleInit() {
    const url = this.config.get<string>('RABBITMQ_URL')?.trim();
    if (!url) {
      this.logger.warn('RABBITMQ_URL not set — chat WS relay disabled');
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
      this.logger.warn(`Chat WS relay failed to start: ${String(err)}`);
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
      const mapped = await mapChatEvent(envelope, this.media, this.users);
      if (mapped) {
        this.hub.publish(mapped.channel, mapped.event, mapped.payload);
      }
      this.channel.ack(msg);
    } catch (err) {
      this.logger.warn(`Failed to relay chat event: ${String(err)}`);
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

async function mapChatEvent(
  envelope: Envelope,
  media: MediaService,
  users: UserProfileClient,
): Promise<{
  channel: string;
  event: string;
  payload: Record<string, unknown>;
} | null> {
  const p = envelope.payload;
  const chatId = typeof p.chatId === 'string' ? p.chatId : null;
  if (!chatId) return null;
  const channel = `chat:${chatId}`;

  if (envelope.eventType === 'chat.message_created') {
    const attachmentIds = Array.isArray(p.attachmentIds)
      ? (p.attachmentIds as string[])
      : [];
    const authorId = typeof p.authorId === 'string' ? p.authorId : '';
    const replyTo =
      p.replyTo && typeof p.replyTo === 'object'
        ? (p.replyTo as {
            id: string;
            authorId: string;
            body: string;
            deleted: boolean;
          })
        : null;
    const lookupIds = [authorId, replyTo?.authorId].filter(
      (id): id is string => Boolean(id),
    );
    const [attachments, profiles] = await Promise.all([
      media.resolveReadyAttachments(attachmentIds),
      users.lookupByIds(lookupIds),
    ]);
    const byUserId = new Map(profiles.map((row) => [row.userId, row]));
    const authorProfile = authorId ? byUserId.get(authorId) : undefined;
    const replyProfile = replyTo?.authorId
      ? byUserId.get(replyTo.authorId)
      : undefined;
    return {
      channel,
      event: 'message.new',
      payload: {
        messageId: p.messageId,
        chatId,
        authorId: p.authorId,
        author: authorProfile
          ? {
              userId: authorProfile.userId,
              displayName: authorProfile.displayName,
              username: authorProfile.username,
              avatarUrl: authorProfile.avatarUrl,
            }
          : authorId
            ? {
                userId: authorId,
                displayName: null,
                username: null,
                avatarUrl: null,
              }
            : null,
        body: p.body,
        mentions: p.mentions ?? [],
        createdAt: p.createdAt,
        editedAt: null,
        deletedAt: null,
        replyToMessageId: p.replyToMessageId ?? null,
        replyTo: replyTo
          ? {
              ...replyTo,
              authorDisplayName:
                replyProfile?.displayName?.trim() ||
                (replyProfile?.username ? `@${replyProfile.username}` : null),
            }
          : null,
        attachments,
      },
    };
  }
  if (envelope.eventType === 'chat.message_edited') {
    return {
      channel,
      event: 'message.edited',
      payload: {
        messageId: p.messageId,
        chatId,
        authorId: p.authorId,
        body: p.body,
        mentions: p.mentions ?? [],
        editedAt: p.editedAt,
      },
    };
  }
  if (envelope.eventType === 'chat.message_deleted') {
    return {
      channel,
      event: 'message.deleted',
      payload: {
        messageId: p.messageId,
        chatId,
        authorId: p.authorId,
        deletedAt: p.deletedAt,
      },
    };
  }
  if (envelope.eventType === 'chat.message_read') {
    return {
      channel,
      event: 'message.read',
      payload: {
        chatId,
        userId: p.userId,
        lastReadMessageId: p.lastReadMessageId ?? null,
        lastReadAt: p.lastReadAt,
      },
    };
  }
  return null;
}
