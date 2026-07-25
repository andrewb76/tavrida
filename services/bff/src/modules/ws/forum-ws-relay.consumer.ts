import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import amqp, {
  type ChannelModel,
  type ConfirmChannel,
  type ConsumeMessage,
} from 'amqplib';
import { UserProfileClient } from '../user-profile/user-profile.client';
import { WsHubService } from './ws-hub.service';

const EXCHANGE = 'tavrida-lot.events';
const QUEUE = 'bff.forum-ws';
const DEAD_QUEUE = `${QUEUE}.dlq`;
const MAX_RETRIES = 5;
const ROUTING_KEYS = [
  'forum.comment_created',
  'forum.comment_promoted_to_topic',
  'forum.reaction_changed',
] as const;

type Envelope = {
  eventId: string;
  eventType: string;
  payload: Record<string, unknown>;
};

@Injectable()
export class ForumWsRelayConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ForumWsRelayConsumer.name);
  private conn: ChannelModel | null = null;
  private channel: ConfirmChannel | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly hub: WsHubService,
    private readonly users: UserProfileClient,
  ) {}

  async onModuleInit() {
    const url = this.config.get<string>('RABBITMQ_URL')?.trim();
    if (!url) {
      this.logger.warn('RABBITMQ_URL not set — forum WS relay disabled');
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
      this.logger.warn(`Forum WS relay failed to start: ${String(err)}`);
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
      const mapped = await mapForumEvent(envelope, this.users);
      if (mapped) {
        this.hub.publish(mapped.channel, mapped.event, mapped.payload);
      }
      this.channel.ack(msg);
    } catch (err) {
      this.logger.warn(`Failed to relay forum event: ${String(err)}`);
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

async function mapForumEvent(
  envelope: Envelope,
  users: UserProfileClient,
): Promise<{
  channel: string;
  event: string;
  payload: Record<string, unknown>;
} | null> {
  const p = envelope.payload;

  if (envelope.eventType === 'forum.comment_created') {
    const topicId = typeof p.topicId === 'string' ? p.topicId : null;
    const commentId = typeof p.commentId === 'string' ? p.commentId : null;
    if (!topicId || !commentId) return null;
    const authorId = typeof p.authorId === 'string' ? p.authorId : '';
    const profiles = authorId ? await users.lookupByIds([authorId]) : [];
    const authorProfile = profiles[0];
    return {
      channel: `forum:${topicId}`,
      event: 'message.new',
      payload: {
        commentId,
        topicId,
        authorId,
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
        parentId: (p.parentId as string | null) ?? null,
        body: typeof p.body === 'string' ? p.body : '',
        attachments: Array.isArray(p.attachments) ? p.attachments : [],
        promotedTopicId: null,
        votePlusCount: 0,
        voteMinusCount: 0,
        score: 0,
        myVote: null,
        canChangeVote: true,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt ?? p.createdAt,
      },
    };
  }

  if (envelope.eventType === 'forum.comment_promoted_to_topic') {
    const sourceTopicId =
      typeof p.sourceTopicId === 'string' ? p.sourceTopicId : null;
    if (!sourceTopicId) return null;
    return {
      channel: `forum:${sourceTopicId}`,
      event: 'topic.promoted',
      payload: {
        sourceTopicId,
        sourceCommentId: p.sourceCommentId,
        newTopicId: p.newTopicId,
        moderatorId: p.moderatorId,
        movedCommentCount: p.movedCommentCount ?? 0,
      },
    };
  }

  if (envelope.eventType === 'forum.reaction_changed') {
    const topicId = typeof p.topicId === 'string' ? p.topicId : null;
    if (!topicId) return null;
    return {
      channel: `forum:${topicId}`,
      event: 'reaction.added',
      payload: {
        topicId,
        contentId: p.contentId,
        contentType: p.contentType,
        userId: p.userId,
        emojiKey: p.emojiKey,
        cleared: Boolean(p.cleared),
      },
    };
  }

  return null;
}
