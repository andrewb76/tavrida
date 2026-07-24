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
      createdAt: Date;
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
        createdAt: input.createdAt.toISOString(),
      },
    });
  }
}
