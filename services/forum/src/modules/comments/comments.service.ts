import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { DataSource, In, Repository } from 'typeorm';
import type { MediaAttachment } from '@tavrida/object-storage';
import { assertForumEditAllowed } from '../../common/forum-edit-window';
import { validateForumContent, syncAttachmentMarkdown } from '../../common/forum-media.validation';
import { CommentClosureEntity } from '../../entities/comment-closure.entity';
import { CommentEntity } from '../../entities/comment.entity';
import { TopicEntity } from '../../entities/topic.entity';
import { ForumEventsPublisher } from '../events/forum-events.publisher';
import { CategoriesService } from '../categories/categories.service';
import { UserProfileClient } from '../user-profile-client/user-profile.client';
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
    private readonly userProfile: UserProfileClient,
  ) {}

  async listByTopic(
    topicId: string,
    viewer?: { userId?: string; changeWindowMinutes?: number; isAdmin?: boolean },
    pagination?: { limit?: number; offset?: number },
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

    const take = pagination?.limit != null ? Math.min(Math.max(pagination.limit, 1), 200) : undefined;
    const skip = pagination?.offset != null ? Math.max(pagination.offset, 0) : undefined;

    const findOptions: Parameters<typeof this.comments.find>[0] = {
      where: { topicId },
      order: { createdAt: 'ASC' as const },
    };
    if (take != null) findOptions.take = take;
    if (skip != null) findOptions.skip = skip;

    const [rows, total] = await this.comments.findAndCount(findOptions);

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
      total,
    };
  }

  async listByAuthor(
    authorId: string,
    pagination?: { limit?: number; offset?: number },
  ) {
    const take = pagination?.limit != null ? Math.min(Math.max(pagination.limit, 1), 200) : 20;
    const skip = pagination?.offset != null ? Math.max(pagination.offset, 0) : 0;

    const qb = this.comments
      .createQueryBuilder('comment')
      .where('comment.author_id = :authorId', { authorId })
      .andWhere('comment.deleted_at IS NULL')
      .orderBy('comment.created_at', 'DESC')
      .skip(skip)
      .take(take);

    const [rows, total] = await qb.getManyAndCount();

    return {
      data: rows.map((row) => ({
        id: row.id,
        topicId: row.topicId,
        authorId: row.authorId,
        parentId: row.parentId,
        body: row.body,
        attachments: row.attachments ?? [],
        promotedTopicId: row.promotedTopicId,
        votePlusCount: row.votePlusCount ?? 0,
        voteMinusCount: row.voteMinusCount ?? 0,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      })),
      total,
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

    const bodyWithAttachments = syncAttachmentMarkdown(input.body.trim(), attachments);

    return this.dataSource.transaction(async (manager) => {
      const comment = manager.create(CommentEntity, {
        id: randomUUID(),
        topicId: input.topicId,
        authorId: input.authorId,
        parentId: input.parentId ?? null,
        body: bodyWithAttachments,
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

      // Denormalized counter on topic
      await manager.increment(TopicEntity, { id: input.topicId }, 'commentCount', 1);

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
        body: comment.body,
        attachments: comment.attachments ?? [],
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
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
      this.userProfile.adjustCounts(input.authorId, { commentDelta: 1 }).catch(() => {});
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
    restoreAttachments?: boolean;
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

    // Sync attachment markdown links into body
    if (input.attachments !== undefined) {
      comment.body = syncAttachmentMarkdown(comment.body, comment.attachments ?? []);
    }

    // Restore: add any missing attachment markdown links to body
    if (input.restoreAttachments && comment.attachments?.length) {
      comment.body = syncAttachmentMarkdown(comment.body, comment.attachments);
    }

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

    // Denormalized counter on topic
    await this.topics.decrement({ id: input.topicId }, 'commentCount', 1);

    // Decrement user's comment count
    this.userProfile.adjustCounts(comment.authorId, { commentDelta: -1 }).catch(() => {});

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
    this.assertModeratorAction(input.asModerator, 'Выделить комментарий в тему могут только администратор и модератор');

    const { sourceTopic, comment } = await this.loadPromoteSource(input.topicId, input.commentId);
    const title = this.resolvePromoteTitle(comment.body, input.title);

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

      const moveIds = await this.movePromotedSubtree(manager, comment, newTopic.id);

      comment.promotedTopicId = newTopic.id;
      await manager.save(comment);

      // Denormalized counters: source loses moved comments, new topic gains them
      await manager.decrement(TopicEntity, { id: sourceTopic.id }, 'commentCount', moveIds.length);
      await manager.increment(TopicEntity, { id: newTopic.id }, 'commentCount', moveIds.length);

      await this.events.enqueueTopicPublished(manager, {
        topicId: newTopic.id,
        authorId: newTopic.authorId,
        categoryId: newTopic.categoryId,
        publishedAt: newTopic.publishedAt ?? new Date(),
      });

      await this.events.enqueueCommentPromotedToTopic(manager, {
        sourceTopicId: sourceTopic.id,
        sourceCommentId: comment.id,
        newTopicId: newTopic.id,
        moderatorId: input.actorId,
        movedCommentCount: moveIds.length,
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

  private assertModeratorAction(asModerator: boolean | undefined, detail: string): void {
    if (!asModerator) {
      throw new ForbiddenException({ type: 'forbidden', detail });
    }
  }

  private async loadPromoteSource(topicId: string, commentId: string) {
    const sourceTopic = await this.topics.findOne({ where: { id: topicId } });
    if (!sourceTopic || sourceTopic.deletedAt) {
      throw new NotFoundException({ type: 'not-found', detail: `Topic ${topicId} not found` });
    }

    const comment = await this.comments.findOne({
      where: { id: commentId, topicId },
    });
    if (!comment || comment.deletedAt) {
      throw new NotFoundException({
        type: 'not-found',
        detail: `Comment ${commentId} not found in topic`,
      });
    }

    if (comment.promotedTopicId) {
      throw new BadRequestException({
        type: 'conflict',
        detail: 'Комментарий уже выделен в тему',
        promotedTopicId: comment.promotedTopicId,
      });
    }

    return { sourceTopic, comment };
  }

  private resolvePromoteTitle(commentBody: string, requestedTitle?: string): string {
    const firstLine = commentBody.trim().split('\n')[0]?.trim() ?? '';
    return (
      requestedTitle?.trim() ||
      firstLine.replace(/^#+\s*/, '').slice(0, 120) ||
      'Тема из комментария'
    ).slice(0, 256);
  }

  private async movePromotedSubtree(
    manager: DataSource['manager'],
    comment: CommentEntity,
    newTopicId: string,
  ): Promise<string[]> {
    const descendantRows = await manager.find(CommentClosureEntity, {
      where: { ancestorId: comment.id },
    });
    const depthFromMarker = new Map(
      descendantRows
        .filter((row) => row.depth > 0)
        .map((row) => [row.descendantId, row.depth] as const),
    );
    const moveIds = [...depthFromMarker.keys()];
    if (!moveIds.length) return moveIds;

    const moved = await manager.find(CommentEntity, {
      where: { id: In(moveIds) },
    });

    for (const row of moved) {
      row.topicId = newTopicId;
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

    return moveIds;
  }

  private mediaPublicBaseUrl() {
    return (
      this.config.get<string>('MEDIA_PUBLIC_BASE_URL') ??
      this.config.get<string>('MINIO_URL') ??
      'http://localhost:9000'
    );
  }
}
