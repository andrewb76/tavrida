import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { DataSource, Repository } from 'typeorm';
import type { MediaAttachment } from '@tavrida/object-storage';
import { assertForumEditAllowed } from '../../common/forum-edit-window';
import { validateForumContent } from '../../common/forum-media.validation';
import { CommentClosureEntity } from '../../entities/comment-closure.entity';
import { CommentEntity } from '../../entities/comment.entity';
import { TopicEntity } from '../../entities/topic.entity';

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(CommentEntity)
    private readonly comments: Repository<CommentEntity>,
    @InjectRepository(CommentClosureEntity)
    private readonly closures: Repository<CommentClosureEntity>,
    @InjectRepository(TopicEntity)
    private readonly topics: Repository<TopicEntity>,
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
  ) {}

  async listByTopic(topicId: string) {
    const topic = await this.topics.findOne({ where: { id: topicId } });
    if (!topic) {
      throw new NotFoundException({ type: 'not-found', detail: `Topic ${topicId} not found` });
    }

    const rows = await this.comments.find({
      where: { topicId },
      order: { createdAt: 'ASC' },
    });

    return {
      data: rows.map((row) => ({
        id: row.id,
        topicId: row.topicId,
        authorId: row.authorId,
        parentId: row.parentId,
        body: row.body,
        attachments: row.attachments ?? [],
        promotedTopicId: row.promotedTopicId,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      })),
    };
  }

  async create(input: {
    topicId: string;
    authorId: string;
    body: string;
    parentId?: string | null;
    attachments?: MediaAttachment[];
    maxAttachmentCount?: number;
    maxAttachmentSizeBytes?: number;
  }) {
    const topic = await this.topics.findOne({ where: { id: input.topicId } });
    if (!topic) {
      throw new NotFoundException({ type: 'not-found', detail: `Topic ${input.topicId} not found` });
    }

    if (input.parentId) {
      const parent = await this.comments.findOne({
        where: { id: input.parentId, topicId: input.topicId },
      });
      if (!parent) {
        throw new NotFoundException({
          type: 'not-found',
          detail: `Parent comment ${input.parentId} not found in topic`,
        });
      }
    }

    const attachments = input.attachments ?? [];
    validateForumContent({
      body: input.body,
      attachments,
      media: {
        authorId: input.authorId,
        publicBaseUrl: this.mediaPublicBaseUrl(),
        maxAttachmentCount: input.maxAttachmentCount ?? 1,
        maxAttachmentSizeBytes: input.maxAttachmentSizeBytes ?? 2 * 1024 * 1024,
      },
    });

    return this.dataSource.transaction(async (manager) => {
      const comment = manager.create(CommentEntity, {
        id: randomUUID(),
        topicId: input.topicId,
        authorId: input.authorId,
        parentId: input.parentId ?? null,
        body: input.body.trim(),
        attachments,
        promotedTopicId: null,
      });
      await manager.save(comment);

      await manager.save(
        manager.create(CommentClosureEntity, {
          ancestorId: comment.id,
          descendantId: comment.id,
          depth: 0,
        }),
      );

      if (input.parentId) {
        const ancestors = await manager.find(CommentClosureEntity, {
          where: { descendantId: input.parentId },
        });
        for (const row of ancestors) {
          await manager.save(
            manager.create(CommentClosureEntity, {
              ancestorId: row.ancestorId,
              descendantId: comment.id,
              depth: row.depth + 1,
            }),
          );
        }
      }

      return {
        id: comment.id,
        topicId: comment.topicId,
        authorId: comment.authorId,
        parentId: comment.parentId,
        body: comment.body,
        attachments: comment.attachments ?? [],
        promotedTopicId: comment.promotedTopicId,
        createdAt: comment.createdAt.toISOString(),
        updatedAt: comment.updatedAt.toISOString(),
      };
    });
  }

  async update(input: {
    topicId: string;
    commentId: string;
    authorId: string;
    body?: string;
    attachments?: MediaAttachment[];
    editWindowMinutes: number;
    maxAttachmentCount?: number;
    maxAttachmentSizeBytes?: number;
  }) {
    const comment = await this.comments.findOne({
      where: { id: input.commentId, topicId: input.topicId },
    });
    if (!comment) {
      throw new NotFoundException({
        type: 'not-found',
        detail: `Comment ${input.commentId} not found in topic`,
      });
    }

    assertForumEditAllowed({
      authorId: comment.authorId,
      editorId: input.authorId,
      createdAt: comment.createdAt,
      editWindowMinutes: input.editWindowMinutes,
    });

    const nextBody = input.body?.trim();
    if (!nextBody && input.attachments === undefined) {
      throw new BadRequestException({
        type: 'validation-error',
        detail: 'Укажите body или attachments для обновления',
      });
    }

    if (nextBody) comment.body = nextBody;
    if (input.attachments !== undefined) comment.attachments = input.attachments;

    validateForumContent({
      body: comment.body,
      attachments: comment.attachments ?? [],
      media: {
        authorId: input.authorId,
        publicBaseUrl: this.mediaPublicBaseUrl(),
        maxAttachmentCount: input.maxAttachmentCount ?? 1,
        maxAttachmentSizeBytes: input.maxAttachmentSizeBytes ?? 2 * 1024 * 1024,
      },
    });

    await this.comments.save(comment);

    return {
      id: comment.id,
      topicId: comment.topicId,
      authorId: comment.authorId,
      parentId: comment.parentId,
      body: comment.body,
      attachments: comment.attachments ?? [],
      promotedTopicId: comment.promotedTopicId,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
    };
  }

  private mediaPublicBaseUrl() {
    return (
      this.config.get<string>('MEDIA_PUBLIC_BASE_URL') ??
      this.config.get<string>('MINIO_URL') ??
      'http://localhost:9000'
    );
  }
}
