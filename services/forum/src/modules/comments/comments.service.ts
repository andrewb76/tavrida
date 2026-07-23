import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { DataSource, In, Repository } from 'typeorm';
import type { MediaAttachment } from '@tavrida/object-storage';
import { assertForumEditAllowed } from '../../common/forum-edit-window';
import { validateForumContent } from '../../common/forum-media.validation';
import { CommentClosureEntity } from '../../entities/comment-closure.entity';
import { CommentEntity } from '../../entities/comment.entity';
import { TopicEntity } from '../../entities/topic.entity';
import { ForumEventsPublisher } from '../events/forum-events.publisher';
import { CategoriesService } from '../categories/categories.service';
import { VotesService } from '../votes/votes.service';

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(CommentEntity)
    private readonly comments: Repository<CommentEntity>,
    @InjectRepository(CommentClosureEntity)
    private readonly closures: Repository<CommentClosureEntity>,
    @InjectRepository(TopicEntity)
    private readonly topics: Repository<TopicEntity>,
    private readonly categoryAcl: CategoriesService,
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
    private readonly votes: VotesService,
    private readonly events: ForumEventsPublisher,
  ) {}

  async listByTopic(
    topicId: string,
    viewer?: { userId?: string; changeWindowMinutes?: number; isAdmin?: boolean },
  ) {
    const topic = await this.topics.findOne({ where: { id: topicId } });
    if (
      !topic ||
      topic.deletedAt ||
      (topic.status === 'DRAFT' && topic.authorId !== viewer?.userId)
    ) {
      throw new NotFoundException({ type: 'not-found', detail: `Topic ${topicId} not found` });
    }
    await this.categoryAcl.assertAccessible(topic.categoryId, {
      viewerId: viewer?.userId,
      isAdmin: viewer?.isAdmin,
    });

    const rows = await this.comments.find({
      where: { topicId },
      order: { createdAt: 'ASC' },
    });

    const changeWindowMinutes = viewer?.changeWindowMinutes ?? 3;
    const mineById = await this.votes.findMineMany(
      'comment',
      rows.map((r) => r.id),
      viewer?.userId,
    );

    return {
      data: rows.map((row) => {
        const mine = mineById.get(row.id) ?? null;
        const vote = this.votes.summarize(
          row.votePlusCount ?? 0,
          row.voteMinusCount ?? 0,
          mine?.value ?? null,
          mine?.createdAt ?? null,
          changeWindowMinutes,
        );
        const deleted = Boolean(row.deletedAt);
        return {
          id: row.id,
          topicId: row.topicId,
          authorId: row.authorId,
          parentId: row.parentId,
          body: deleted ? 'Комментарий удалён' : row.body,
          attachments: deleted ? [] : row.attachments ?? [],
          promotedTopicId: row.promotedTopicId,
          deletedAt: row.deletedAt?.toISOString() ?? null,
          votePlusCount: vote.plusCount,
          voteMinusCount: vote.minusCount,
          score: vote.score,
          myVote: vote.myVote,
          canChangeVote: deleted ? false : vote.canChange,
          createdAt: row.createdAt.toISOString(),
          updatedAt: row.updatedAt.toISOString(),
        };
      }),
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
    isAdmin?: boolean;
  }) {
    const topic = await this.topics.findOne({ where: { id: input.topicId } });
    if (!topic || topic.deletedAt) {
      throw new NotFoundException({ type: 'not-found', detail: `Topic ${input.topicId} not found` });
    }
    if (topic.status !== 'PUBLISHED') {
      throw new BadRequestException({
        type: 'validation-error',
        detail: 'Черновик нельзя комментировать — сначала опубликуйте тему',
      });
    }
    await this.categoryAcl.assertAccessible(topic.categoryId, {
      viewerId: input.authorId,
      isAdmin: input.isAdmin,
    });

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

      await this.events.enqueueCommentCreated(manager, {
        commentId: comment.id,
        topicId: comment.topicId,
        authorId: comment.authorId,
        parentId: comment.parentId,
        createdAt: comment.createdAt,
      });

      return {
        id: comment.id,
        topicId: comment.topicId,
        authorId: comment.authorId,
        parentId: comment.parentId,
        body: comment.body,
        attachments: comment.attachments ?? [],
        promotedTopicId: comment.promotedTopicId,
        votePlusCount: 0,
        voteMinusCount: 0,
        score: 0,
        myVote: null,
        canChangeVote: true,
        createdAt: comment.createdAt.toISOString(),
        updatedAt: comment.updatedAt.toISOString(),
      };
    }).then((created) => {
      this.events.flush();
      return created;
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
    asModerator?: boolean;
  }) {
    const comment = await this.comments.findOne({
      where: { id: input.commentId, topicId: input.topicId },
    });
    if (!comment || comment.deletedAt) {
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
      asModerator: input.asModerator,
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
      deletedAt: null,
      votePlusCount: comment.votePlusCount ?? 0,
      voteMinusCount: comment.voteMinusCount ?? 0,
      score: (comment.votePlusCount ?? 0) - (comment.voteMinusCount ?? 0),
      myVote: null,
      canChangeVote: true,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
    };
  }

  async softDelete(input: {
    topicId: string;
    commentId: string;
    actorId: string;
    asModerator?: boolean;
  }) {
    if (!input.asModerator) {
      throw new ForbiddenException({
        type: 'forbidden',
        detail: 'Удалять комментарии могут только администратор и модератор',
      });
    }
    const comment = await this.comments.findOne({
      where: { id: input.commentId, topicId: input.topicId },
    });
    if (!comment || comment.deletedAt) {
      throw new NotFoundException({
        type: 'not-found',
        detail: `Comment ${input.commentId} not found in topic`,
      });
    }
    comment.deletedAt = new Date();
    await this.comments.save(comment);
    return {
      ok: true,
      commentId: comment.id,
      deletedAt: comment.deletedAt.toISOString(),
    };
  }

  /**
   * Promote comment → new topic in the same category.
   * Marker comment stays in the source topic; its subtree moves into the new topic
   * (direct children become roots of Topic B).
   */
  async promoteToTopic(input: {
    topicId: string;
    commentId: string;
    actorId: string;
    title?: string;
    asModerator?: boolean;
  }) {
    if (!input.asModerator) {
      throw new ForbiddenException({
        type: 'forbidden',
        detail: 'Выделить комментарий в тему могут только администратор и модератор',
      });
    }

    const sourceTopic = await this.topics.findOne({ where: { id: input.topicId } });
    if (!sourceTopic || sourceTopic.deletedAt) {
      throw new NotFoundException({ type: 'not-found', detail: `Topic ${input.topicId} not found` });
    }

    const comment = await this.comments.findOne({
      where: { id: input.commentId, topicId: input.topicId },
    });
    if (!comment || comment.deletedAt) {
      throw new NotFoundException({
        type: 'not-found',
        detail: `Comment ${input.commentId} not found in topic`,
      });
    }

    if (comment.promotedTopicId) {
      throw new BadRequestException({
        type: 'conflict',
        detail: 'Комментарий уже выделен в тему',
        promotedTopicId: comment.promotedTopicId,
      });
    }

    const firstLine = comment.body.trim().split('\n')[0]?.trim() ?? '';
    const title = (
      input.title?.trim() ||
      firstLine.replace(/^#+\s*/, '').slice(0, 120) ||
      'Тема из комментария'
    ).slice(0, 256);

    return this.dataSource.transaction(async (manager) => {
      const newTopic = manager.create(TopicEntity, {
        id: randomUUID(),
        categoryId: sourceTopic.categoryId,
        authorId: comment.authorId,
        title,
        body: comment.body,
        attachments: comment.attachments ?? [],
        isPinned: false,
        tags: [],
        status: 'PUBLISHED',
        publishedAt: new Date(),
      });
      await manager.save(newTopic);

      const descendantRows = await manager.find(CommentClosureEntity, {
        where: { ancestorId: comment.id },
      });
      const depthFromMarker = new Map(
        descendantRows
          .filter((row) => row.depth > 0)
          .map((row) => [row.descendantId, row.depth] as const),
      );
      const moveIds = [...depthFromMarker.keys()];

      if (moveIds.length) {
        const moved = await manager.find(CommentEntity, {
          where: { id: In(moveIds) },
        });

        for (const row of moved) {
          row.topicId = newTopic.id;
          if (row.parentId === comment.id || !moveIds.includes(row.parentId ?? '')) {
            row.parentId = null;
          }
        }
        await manager.save(moved);

        await manager
          .createQueryBuilder()
          .delete()
          .from(CommentClosureEntity)
          .where('descendant_id IN (:...ids)', { ids: moveIds })
          .execute();

        for (const row of moved) {
          await manager.save(
            manager.create(CommentClosureEntity, {
              ancestorId: row.id,
              descendantId: row.id,
              depth: 0,
            }),
          );
        }

        // Parents before children — reuse distances from the old marker tree.
        moved.sort(
          (a, b) => (depthFromMarker.get(a.id) ?? 0) - (depthFromMarker.get(b.id) ?? 0),
        );
        for (const row of moved) {
          if (!row.parentId) continue;
          const parentAncestors = await manager.find(CommentClosureEntity, {
            where: { descendantId: row.parentId },
          });
          for (const ancestor of parentAncestors) {
            await manager.save(
              manager.create(CommentClosureEntity, {
                ancestorId: ancestor.ancestorId,
                descendantId: row.id,
                depth: ancestor.depth + 1,
              }),
            );
          }
        }
      }

      comment.promotedTopicId = newTopic.id;
      await manager.save(comment);

      await this.events.enqueueTopicPublished(manager, {
        topicId: newTopic.id,
        authorId: newTopic.authorId,
        categoryId: newTopic.categoryId,
        publishedAt: newTopic.publishedAt ?? new Date(),
      });

      return {
        commentId: comment.id,
        sourceTopicId: sourceTopic.id,
        promotedTopicId: newTopic.id,
        title: newTopic.title,
        movedCommentCount: moveIds.length,
      };
    }).then((result) => {
      this.events.flush();
      return result;
    });
  }

  private mediaPublicBaseUrl() {
    return (
      this.config.get<string>('MEDIA_PUBLIC_BASE_URL') ??
      this.config.get<string>('MINIO_URL') ??
      'http://localhost:9000'
    );
  }
}
