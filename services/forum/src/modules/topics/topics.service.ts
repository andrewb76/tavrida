import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { Repository } from 'typeorm';
import type { MediaAttachment } from '@tavrida/object-storage';
import { validateForumContent } from '../../common/forum-media.validation';
import { CategoryEntity } from '../../entities/category.entity';
import { TopicEntity } from '../../entities/topic.entity';

@Injectable()
export class TopicsService {
  constructor(
    @InjectRepository(TopicEntity)
    private readonly topics: Repository<TopicEntity>,
    @InjectRepository(CategoryEntity)
    private readonly categories: Repository<CategoryEntity>,
    private readonly config: ConfigService,
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

  async getById(topicId: string) {
    const row = await this.topics.findOne({ where: { id: topicId } });
    if (!row) {
      throw new NotFoundException({ type: 'not-found', detail: `Topic ${topicId} not found` });
    }
    return this.toDetail(row);
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
    });
    await this.topics.save(row);
    return this.toDetail(row);
  }

  private mediaPublicBaseUrl() {
    return (
      this.config.get<string>('MEDIA_PUBLIC_BASE_URL') ??
      this.config.get<string>('MINIO_URL') ??
      'http://localhost:9000'
    );
  }

  private toSummary(row: TopicEntity) {
    return {
      id: row.id,
      categoryId: row.categoryId,
      authorId: row.authorId,
      title: row.title,
      excerpt: row.body.slice(0, 200),
      isPinned: row.isPinned,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toDetail(row: TopicEntity) {
    return {
      ...this.toSummary(row),
      body: row.body,
      attachments: row.attachments ?? [],
    };
  }
}
