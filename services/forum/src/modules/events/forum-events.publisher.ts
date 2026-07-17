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
}
