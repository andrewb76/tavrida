import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { Repository } from 'typeorm';
import { CategoryEntity } from '../../entities/category.entity';
import { TopicEntity } from '../../entities/topic.entity';

@Injectable()
export class TopicsService {
  constructor(
    @InjectRepository(TopicEntity)
    private readonly topics: Repository<TopicEntity>,
    @InjectRepository(CategoryEntity)
    private readonly categories: Repository<CategoryEntity>,
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
  }) {
    const category = await this.categories.findOne({ where: { id: input.categoryId } });
    if (!category) {
      throw new NotFoundException({
        type: 'not-found',
        detail: `Category ${input.categoryId} not found`,
      });
    }

    const row = this.topics.create({
      id: randomUUID(),
      categoryId: input.categoryId,
      authorId: input.authorId,
      title: input.title.trim(),
      body: input.body.trim(),
      isPinned: false,
    });
    await this.topics.save(row);
    return this.toDetail(row);
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
    };
  }
}
