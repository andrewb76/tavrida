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
export class ForumEventsPublisher implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ForumEventsPublisher.name);
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

  async enqueueTagContentTagged(
    manager: EntityManager,
    input: {
      tagIds: string[];
      topicId: string;
      actorId: string;
    },
  ): Promise<void> {
    for (const tagId of input.tagIds) {
      await enqueueDomainEvent(manager, {
        eventType: 'tag.content_tagged',
        producer: 'forum',
        correlationId: input.topicId,
        payload: {
          tagId,
          topicId: input.topicId,
          contentType: 'topic' as const,
          contentId: input.topicId,
          excludeUserIds: [input.actorId],
        },
      });
    }
  }

  async enqueueTopicPublished(
    manager: EntityManager,
    input: {
      topicId: string;
      authorId: string;
      categoryId: string;
      publishedAt: Date;
    },
  ): Promise<void> {
    await enqueueDomainEvent(manager, {
      eventType: 'forum.topic_published',
      producer: 'forum',
      correlationId: input.topicId,
      payload: {
        topicId: input.topicId,
        authorId: input.authorId,
        categoryId: input.categoryId,
        publishedAt: input.publishedAt.toISOString(),
      },
    });
  }

  async enqueueCommentCreated(
    manager: EntityManager,
    input: {
      commentId: string;
      topicId: string;
      authorId: string;
      parentId: string | null;
      body: string;
      attachments: Array<{
        url: string;
        filename: string;
        contentType: string;
        sizeBytes: number;
      }>;
      createdAt: Date;
      updatedAt: Date;
    },
  ): Promise<void> {
    await enqueueDomainEvent(manager, {
      eventType: 'forum.comment_created',
      producer: 'forum',
      correlationId: input.topicId,
      payload: {
        commentId: input.commentId,
        topicId: input.topicId,
        authorId: input.authorId,
        parentId: input.parentId,
        body: input.body,
        attachments: input.attachments,
        createdAt: input.createdAt.toISOString(),
        updatedAt: input.updatedAt.toISOString(),
      },
    });
  }

  async enqueueCommentPromotedToTopic(
    manager: EntityManager,
    input: {
      sourceTopicId: string;
      sourceCommentId: string;
      newTopicId: string;
      moderatorId: string;
      movedCommentCount: number;
    },
  ): Promise<void> {
    await enqueueDomainEvent(manager, {
      eventType: 'forum.comment_promoted_to_topic',
      producer: 'forum',
      correlationId: input.sourceTopicId,
      payload: {
        sourceTopicId: input.sourceTopicId,
        sourceCommentId: input.sourceCommentId,
        newTopicId: input.newTopicId,
        moderatorId: input.moderatorId,
        movedCommentCount: input.movedCommentCount,
      },
    });
  }

  async enqueueReactionChanged(
    manager: EntityManager,
    input: {
      topicId: string;
      contentId: string;
      contentType: 'topic' | 'comment';
      userId: string;
      emojiKey: string | null;
      cleared: boolean;
    },
  ): Promise<void> {
    await enqueueDomainEvent(manager, {
      eventType: 'forum.reaction_changed',
      producer: 'forum',
      correlationId: input.topicId,
      payload: {
        topicId: input.topicId,
        contentId: input.contentId,
        contentType: input.contentType,
        userId: input.userId,
        emojiKey: input.emojiKey,
        cleared: input.cleared,
      },
    });
  }
}
