import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { DataSource, IsNull, Repository } from 'typeorm';
import type { MediaAttachment } from '@tavrida/object-storage';
import { assertForumEditAllowed } from '../../common/forum-edit-window';
import { validateForumContent } from '../../common/forum-media.validation';
import { CategoryEntity } from '../../entities/category.entity';
import { TopicEntity } from '../../entities/topic.entity';
import { ForumEventsPublisher } from '../events/forum-events.publisher';
import { CategoriesService } from '../categories/categories.service';
import { TagsService } from '../tags/tags.service';
import { VotesService } from '../votes/votes.service';

export type TopicStatus = 'DRAFT' | 'PUBLISHED';

@Injectable()
export class TopicsService {
  constructor(
    @InjectRepository(TopicEntity)
    private readonly topics: Repository<TopicEntity>,
    @InjectRepository(CategoryEntity)
    private readonly categories: Repository<CategoryEntity>,
    private readonly categoryAcl: CategoriesService,
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
    private readonly votes: VotesService,
    private readonly tags: TagsService,
    private readonly events: ForumEventsPublisher,
  ) {}

  async list(input: {
    categoryId?: string;
    limit?: number;
    status?: TopicStatus;
    authorId?: string;
    viewerId?: string;
    isAdmin?: boolean;
  }) {
    const take = Math.min(Math.max(input.limit ?? 20, 1), 100);
    const status: TopicStatus = input.status === 'DRAFT' ? 'DRAFT' : 'PUBLISHED';
    const access = { viewerId: input.viewerId, isAdmin: input.isAdmin };

    if (input.categoryId) {
      await this.categoryAcl.assertAccessible(input.categoryId, access);
    }

    if (status === 'DRAFT') {
      if (!input.authorId) {
        throw new BadRequestException({
          type: 'validation-error',
          detail: 'Для списка черновиков нужен authorId',
        });
      }
      const rows = await this.topics.find({
        where: {
          status: 'DRAFT',
          authorId: input.authorId,
          deletedAt: IsNull(),
          ...(input.categoryId ? { categoryId: input.categoryId } : {}),
        },
        order: { updatedAt: 'DESC' },
        take,
      });
      return { data: rows.map((row) => this.toSummary(row)) };
    }

    const rows = await this.topics.find({
      where: {
        status: 'PUBLISHED',
        deletedAt: IsNull(),
        ...(input.categoryId ? { categoryId: input.categoryId } : {}),
      },
      order: { isPinned: 'DESC', createdAt: 'DESC' },
      take,
    });

    if (input.categoryId || input.isAdmin) {
      return { data: rows.map((row) => this.toSummary(row)) };
    }

    const allowed = new Set(await this.categoryAcl.listAccessibleCategoryIds(access));
    return {
      data: rows.filter((row) => allowed.has(row.categoryId)).map((row) => this.toSummary(row)),
    };
  }

  async getById(
    topicId: string,
    viewer?: { userId?: string; changeWindowMinutes?: number; isAdmin?: boolean },
  ) {
    const row = await this.requireVisibleTopic(topicId, viewer?.userId);
    await this.categoryAcl.assertAccessible(row.categoryId, {
      viewerId: viewer?.userId,
      isAdmin: viewer?.isAdmin,
    });
    return this.toDetail(row, viewer);
  }

  /** Load topic if viewer may see it; drafts → author only (404 otherwise). */
  async requireVisibleTopic(topicId: string, viewerId?: string): Promise<TopicEntity> {
    const row = await this.topics.findOne({ where: { id: topicId } });
    if (!row || row.deletedAt) {
      throw new NotFoundException({ type: 'not-found', detail: `Topic ${topicId} not found` });
    }
    if (row.status === 'DRAFT' && row.authorId !== viewerId) {
      throw new NotFoundException({ type: 'not-found', detail: `Topic ${topicId} not found` });
    }
    return row;
  }

  async assertPublishedTopic(topicId: string): Promise<TopicEntity> {
    const row = await this.topics.findOne({ where: { id: topicId } });
    if (!row) {
      throw new NotFoundException({ type: 'not-found', detail: `Topic ${topicId} not found` });
    }
    if (row.status !== 'PUBLISHED') {
      throw new BadRequestException({
        type: 'validation-error',
        detail: 'Черновик нельзя комментировать или голосовать — сначала опубликуйте тему',
      });
    }
    return row;
  }

  async create(input: {
    categoryId: string;
    authorId: string;
    title: string;
    body: string;
    status?: TopicStatus;
    attachments?: MediaAttachment[];
    maxAttachmentCount?: number;
    maxAttachmentSizeBytes?: number;
    isAdmin?: boolean;
  }) {
    const category = await this.categories.findOne({ where: { id: input.categoryId } });
    if (!category) {
      throw new NotFoundException({
        type: 'not-found',
        detail: `Category ${input.categoryId} not found`,
      });
    }
    await this.categoryAcl.assertAccessible(input.categoryId, {
      viewerId: input.authorId,
      isAdmin: input.isAdmin,
    });

    const status: TopicStatus = input.status === 'DRAFT' ? 'DRAFT' : 'PUBLISHED';
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

    const now = new Date();
    const row = this.topics.create({
      id: randomUUID(),
      categoryId: input.categoryId,
      authorId: input.authorId,
      title: input.title.trim(),
      body: input.body.trim(),
      attachments,
      isPinned: false,
      tags: [],
      status,
      publishedAt: status === 'PUBLISHED' ? now : null,
    });

    if (status === 'PUBLISHED') {
      await this.dataSource.transaction(async (manager) => {
        await manager.save(row);
        await this.events.enqueueTopicPublished(manager, {
          topicId: row.id,
          authorId: row.authorId,
          categoryId: row.categoryId,
          publishedAt: row.publishedAt ?? now,
        });
      });
      this.events.flush();
    } else {
      await this.topics.save(row);
    }

    return this.toDetail(row);
  }

  async update(input: {
    topicId: string;
    authorId: string;
    title?: string;
    body?: string;
    attachments?: MediaAttachment[];
    status?: TopicStatus;
    editWindowMinutes: number;
    maxAttachmentCount?: number;
    maxAttachmentSizeBytes?: number;
    asModerator?: boolean;
  }) {
    const row = await this.topics.findOne({ where: { id: input.topicId } });
    if (!row || row.deletedAt) {
      throw new NotFoundException({ type: 'not-found', detail: `Topic ${input.topicId} not found` });
    }

    if (!input.asModerator && row.authorId !== input.authorId) {
      throw new BadRequestException({
        type: 'forbidden',
        detail: 'Можно редактировать только свой контент',
      });
    }

    if (input.status === 'DRAFT' && row.status === 'PUBLISHED') {
      throw new BadRequestException({
        type: 'validation-error',
        detail: 'Опубликованную тему нельзя вернуть в черновик',
      });
    }

    const publishing = input.status === 'PUBLISHED' && row.status === 'DRAFT';

    if (row.status === 'PUBLISHED' && !publishing) {
      assertForumEditAllowed({
        authorId: row.authorId,
        editorId: input.authorId,
        createdAt: row.publishedAt ?? row.createdAt,
        editWindowMinutes: input.editWindowMinutes,
        asModerator: input.asModerator,
      });
    }

    const nextTitle = input.title?.trim();
    const nextBody = input.body?.trim();
    const hasContentPatch =
      Boolean(nextTitle) || Boolean(nextBody) || input.attachments !== undefined;

    if (!hasContentPatch && !publishing) {
      throw new BadRequestException({
        type: 'validation-error',
        detail: 'Укажите title, body, attachments или status: PUBLISHED',
      });
    }

    if (nextTitle) row.title = nextTitle;
    if (nextBody) row.body = nextBody;
    if (input.attachments !== undefined) row.attachments = input.attachments;

    if (hasContentPatch) {
      validateForumContent({
        body: row.body,
        attachments: row.attachments ?? [],
        media: {
          authorId: input.authorId,
          publicBaseUrl: this.mediaPublicBaseUrl(),
          maxAttachmentCount: input.maxAttachmentCount ?? 1,
          maxAttachmentSizeBytes: input.maxAttachmentSizeBytes ?? 2 * 1024 * 1024,
        },
      });
    }

    if (publishing) {
      row.status = 'PUBLISHED';
      row.publishedAt = new Date();
    }

    if (publishing) {
      await this.dataSource.transaction(async (manager) => {
        await manager.save(row);
        await this.events.enqueueTopicPublished(manager, {
          topicId: row.id,
          authorId: row.authorId,
          categoryId: row.categoryId,
          publishedAt: row.publishedAt ?? new Date(),
        });
      });
      this.events.flush();
      await this.tags.emitExistingTopicTags({
        topicId: row.id,
        actorId: input.authorId,
      });
    } else {
      await this.topics.save(row);
    }

    return this.toDetail(row);
  }

  async softDelete(input: { topicId: string; actorId: string; asModerator?: boolean }) {
    if (!input.asModerator) {
      throw new BadRequestException({
        type: 'forbidden',
        detail: 'Удалять темы могут только администратор и модератор',
      });
    }
    const row = await this.topics.findOne({ where: { id: input.topicId } });
    if (!row || row.deletedAt) {
      throw new NotFoundException({ type: 'not-found', detail: `Topic ${input.topicId} not found` });
    }
    row.deletedAt = new Date();
    await this.topics.save(row);
    return { ok: true, topicId: row.id, deletedAt: row.deletedAt.toISOString() };
  }

  async updateTags(input: {
    topicId: string;
    authorId: string;
    tags: string[];
    asModerator?: boolean;
  }) {
    const row = await this.topics.findOne({ where: { id: input.topicId } });
    if (!row) {
      throw new NotFoundException({ type: 'not-found', detail: `Topic ${input.topicId} not found` });
    }
    if (!input.asModerator && row.authorId !== input.authorId) {
      throw new BadRequestException({
        type: 'forbidden',
        detail: 'Только автор или модератор может менять теги темы',
      });
    }
    const { tagItems, slugs, addedTagIds } = await this.tags.replaceTopicTags({
      topicId: row.id,
      addedBy: input.authorId,
      labels: input.tags,
      emitEvents: row.status === 'PUBLISHED',
    });
    row.tags = slugs;
    const detail = await this.toDetail(row);
    return {
      ...detail,
      tags: slugs,
      tagItems,
      /** For BFF / RMQ: newly attached tags → `tag.content_tagged` (published only). */
      addedTagIds: row.status === 'PUBLISHED' ? addedTagIds : [],
    };
  }

  private mediaPublicBaseUrl() {
    return (
      this.config.get<string>('MEDIA_PUBLIC_BASE_URL') ??
      this.config.get<string>('MINIO_URL') ??
      'http://localhost:9000'
    );
  }

  private toSummary(row: TopicEntity, tagItems?: Awaited<ReturnType<TagsService['listForContent']>>) {
    return {
      id: row.id,
      categoryId: row.categoryId,
      authorId: row.authorId,
      title: row.title,
      excerpt: row.body.slice(0, 200),
      isPinned: row.isPinned,
      status: row.status,
      publishedAt: row.publishedAt?.toISOString() ?? null,
      votePlusCount: row.votePlusCount ?? 0,
      voteMinusCount: row.voteMinusCount ?? 0,
      score: (row.votePlusCount ?? 0) - (row.voteMinusCount ?? 0),
      tags: tagItems?.map((t) => t.slug) ?? row.tags ?? [],
      tagItems: tagItems ?? undefined,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private async toDetail(
    row: TopicEntity,
    viewer?: { userId?: string; changeWindowMinutes?: number },
  ) {
    const changeWindowMinutes = viewer?.changeWindowMinutes ?? 3;
    const mine = await this.votes.findMine(row.id, 'topic', viewer?.userId);
    const vote = this.votes.summarize(
      row.votePlusCount ?? 0,
      row.voteMinusCount ?? 0,
      mine?.value ?? null,
      mine?.createdAt ?? null,
      changeWindowMinutes,
    );
    const tagItems = await this.tags.syncLegacyTopic(row);
    return {
      ...this.toSummary(row, tagItems),
      body: row.body,
      attachments: row.attachments ?? [],
      myVote: vote.myVote,
      canChangeVote: vote.canChange,
    };
  }
}
