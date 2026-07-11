import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { DataSource, Repository } from 'typeorm';
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

    return this.dataSource.transaction(async (manager) => {
      const comment = manager.create(CommentEntity, {
        id: randomUUID(),
        topicId: input.topicId,
        authorId: input.authorId,
        parentId: input.parentId ?? null,
        body: input.body.trim(),
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
        promotedTopicId: comment.promotedTopicId,
        createdAt: comment.createdAt.toISOString(),
        updatedAt: comment.updatedAt.toISOString(),
      };
    });
  }
}
