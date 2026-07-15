import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { Repository } from 'typeorm';
import type { MediaAttachment } from '@tavrida/object-storage';
import { assertForumEditAllowed } from '../../common/forum-edit-window';
import { validateForumContent } from '../../common/forum-media.validation';
import { CategoryEntity } from '../../entities/category.entity';
import { TopicEntity } from '../../entities/topic.entity';
import { TagsService } from '../tags/tags.service';
import { VotesService } from '../votes/votes.service';

@Injectable()
export class TopicsService {
  constructor(
    @InjectRepository(TopicEntity)
    private readonly topics: Repository<TopicEntity>,
    @InjectRepository(CategoryEntity)
    private readonly categories: Repository<CategoryEntity>,
    private readonly config: ConfigService,
    private readonly votes: VotesService,
    private readonly tags: TagsService,
  ) {}

  async list(input: { categoryId?: string; limit?: number }) {
    const take = Math.min(Math.max(input.limit ?? 20, 1), 100);
    const rows = await this.topics.find({
      where: input.categoryId ? { categoryId: input.categoryId } : {},
      order: { isPinned: 'DESC', createdAt: 'DESC' },
      take,
    });

    return {
      data: rows.map((row) => this.toSummary(row)),
    };
  }

  async getById(
    topicId: string,
    viewer?: { userId?: string; changeWindowMinutes?: number },
  ) {
    const row = await this.topics.findOne({ where: { id: topicId } });
    if (!row) {
      throw new NotFoundException({ type: 'not-found', detail: `Topic ${topicId} not found` });
    }
    return this.toDetail(row, viewer);
  }

  async create(input: {
    categoryId: string;
    authorId: string;
    title: string;
    body: string;
    attachments?: MediaAttachment[];
    maxAttachmentCount?: number;
    maxAttachmentSizeBytes?: number;
  }) {
    const category = await this.categories.findOne({ where: { id: input.categoryId } });
    if (!category) {
      throw new NotFoundException({
        type: 'not-found',
        detail: `Category ${input.categoryId} not found`,
      });
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

    const row = this.topics.create({
      id: randomUUID(),
      categoryId: input.categoryId,
      authorId: input.authorId,
      title: input.title.trim(),
      body: input.body.trim(),
      attachments,
      isPinned: false,
      tags: [],
    });
    await this.topics.save(row);
    return this.toDetail(row);
  }

  async update(input: {
    topicId: string;
    authorId: string;
    title?: string;
    body?: string;
    attachments?: MediaAttachment[];
    editWindowMinutes: number;
    maxAttachmentCount?: number;
    maxAttachmentSizeBytes?: number;
  }) {
    const row = await this.topics.findOne({ where: { id: input.topicId } });
    if (!row) {
      throw new NotFoundException({ type: 'not-found', detail: `Topic ${input.topicId} not found` });
    }

    assertForumEditAllowed({
      authorId: row.authorId,
      editorId: input.authorId,
      createdAt: row.createdAt,
      editWindowMinutes: input.editWindowMinutes,
    });

    const nextTitle = input.title?.trim();
    const nextBody = input.body?.trim();
    if (!nextTitle && !nextBody && input.attachments === undefined) {
      throw new BadRequestException({
        type: 'validation-error',
        detail: 'Укажите title, body или attachments для обновления',
      });
    }

    if (nextTitle) row.title = nextTitle;
    if (nextBody) row.body = nextBody;
    if (input.attachments !== undefined) row.attachments = input.attachments;

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

    await this.topics.save(row);
    return this.toDetail(row);
  }

  async updateTags(input: { topicId: string; authorId: string; tags: string[] }) {
    const row = await this.topics.findOne({ where: { id: input.topicId } });
    if (!row) {
      throw new NotFoundException({ type: 'not-found', detail: `Topic ${input.topicId} not found` });
    }
    if (row.authorId !== input.authorId) {
      throw new BadRequestException({
        type: 'forbidden',
        detail: 'Только автор может менять теги темы',
      });
    }
    const { tagItems, slugs, addedTagIds } = await this.tags.replaceTopicTags({
      topicId: row.id,
      addedBy: input.authorId,
      labels: input.tags,
    });
    row.tags = slugs;
    const detail = await this.toDetail(row);
    return {
      ...detail,
      tags: slugs,
      tagItems,
      /** For BFF / RMQ: newly attached tags → `tag.content_tagged`. */
      addedTagIds,
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
