import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { enqueueDomainEvent, OutboxRelay } from '@tavrida/outbox';
import { DataSource, type EntityManager } from 'typeorm';
import type { ChatKind, MessageMention } from '../../common/chat.types';

type ReplyPreviewPayload = {
  id: string;
  authorId: string;
  body: string;
  deleted: boolean;
};

@Injectable()
export class ChatEventsPublisher implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ChatEventsPublisher.name);
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

  async enqueueMessageCreated(
    manager: EntityManager,
    input: {
      messageId: string;
      chatId: string;
      kind: ChatKind;
      authorId: string;
      body: string;
      mentions: MessageMention[];
      createdAt: Date;
      replyToMessageId: string | null;
      replyTo: ReplyPreviewPayload | null;
      attachmentIds?: string[];
    },
  ): Promise<void> {
    await enqueueDomainEvent(manager, {
      eventType: 'chat.message_created',
      producer: 'chat',
      correlationId: input.chatId,
      payload: {
        messageId: input.messageId,
        chatId: input.chatId,
        kind: input.kind,
        authorId: input.authorId,
        body: input.body,
        mentions: input.mentions,
        createdAt: input.createdAt.toISOString(),
        replyToMessageId: input.replyToMessageId,
        replyTo: input.replyTo,
        attachmentIds: input.attachmentIds ?? [],
        mentionUserIds: input.mentions.map((m) => m.userId),
      },
    });
  }

  async enqueueMessageEdited(
    manager: EntityManager,
    input: {
      messageId: string;
      chatId: string;
      authorId: string;
      body: string;
      mentions: MessageMention[];
      editedAt: Date;
    },
  ): Promise<void> {
    await enqueueDomainEvent(manager, {
      eventType: 'chat.message_edited',
      producer: 'chat',
      correlationId: input.chatId,
      payload: {
        messageId: input.messageId,
        chatId: input.chatId,
        authorId: input.authorId,
        body: input.body,
        mentions: input.mentions,
        editedAt: input.editedAt.toISOString(),
      },
    });
  }

  async enqueueMessageDeleted(
    manager: EntityManager,
    input: {
      messageId: string;
      chatId: string;
      authorId: string;
      deletedAt: Date;
    },
  ): Promise<void> {
    await enqueueDomainEvent(manager, {
      eventType: 'chat.message_deleted',
      producer: 'chat',
      correlationId: input.chatId,
      payload: {
        messageId: input.messageId,
        chatId: input.chatId,
        authorId: input.authorId,
        deletedAt: input.deletedAt.toISOString(),
      },
    });
  }

  async enqueueMessageRead(
    manager: EntityManager,
    input: {
      chatId: string;
      userId: string;
      lastReadMessageId: string | null;
      lastReadAt: Date;
    },
  ): Promise<void> {
    await enqueueDomainEvent(manager, {
      eventType: 'chat.message_read',
      producer: 'chat',
      correlationId: input.chatId,
      payload: {
        chatId: input.chatId,
        userId: input.userId,
        lastReadMessageId: input.lastReadMessageId,
        lastReadAt: input.lastReadAt.toISOString(),
      },
    });
  }
}
