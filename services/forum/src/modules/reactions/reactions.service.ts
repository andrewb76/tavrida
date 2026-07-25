import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import type { ForumContentType } from '../../entities/reaction.entity';
import { ReactionEntity } from '../../entities/reaction.entity';
import { CommentEntity } from '../../entities/comment.entity';
import { TopicEntity } from '../../entities/topic.entity';
import { ForumEventsPublisher } from '../events/forum-events.publisher';

const FREE_EMOJI_KEYS = new Set(['+1', '-1', 'heart', 'surprised', 'thinking']);

@Injectable()
export class ReactionsService {
  constructor(
    @InjectRepository(ReactionEntity)
    private readonly reactions: Repository<ReactionEntity>,
    @InjectRepository(CommentEntity)
    private readonly comments: Repository<CommentEntity>,
    @InjectRepository(TopicEntity)
    private readonly topics: Repository<TopicEntity>,
    private readonly dataSource: DataSource,
    private readonly events: ForumEventsPublisher,
  ) {}

  async list(contentId: string, contentType: ForumContentType) {
    const rows = await this.reactions.find({
      where: { contentId, contentType },
      order: { createdAt: 'ASC' },
    });

    const grouped = new Map<string, { emojiKey: string; count: number; userIds: string[] }>();
    for (const row of rows) {
      const bucket = grouped.get(row.emojiKey) ?? {
        emojiKey: row.emojiKey,
        count: 0,
        userIds: [],
      };
      bucket.count += 1;
      bucket.userIds.push(row.userId);
      grouped.set(row.emojiKey, bucket);
    }

    return {
      contentId,
      contentType,
      reactions: [...grouped.values()],
    };
  }

  async upsert(input: {
    contentId: string;
    contentType: ForumContentType;
    userId: string;
    emojiKey: string;
    allowPaid?: boolean;
  }) {
    if (!FREE_EMOJI_KEYS.has(input.emojiKey) && !input.allowPaid) {
      return {
        allowed: false,
        reason: 'paid_reaction_requires_pro',
      };
    }

    const topicId = await this.resolveTopicId(input.contentId, input.contentType);

    const result = await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(ReactionEntity);
      const existing = await repo.findOne({
        where: {
          contentId: input.contentId,
          contentType: input.contentType,
          userId: input.userId,
        },
      });

      let emojiKey: string | null = input.emojiKey;
      let cleared = false;
      let updated = false;

      if (existing) {
        if (existing.emojiKey === input.emojiKey) {
          await repo.remove(existing);
          emojiKey = null;
          cleared = true;
          updated = false;
        } else {
          existing.emojiKey = input.emojiKey;
          await repo.save(existing);
          updated = true;
        }
      } else {
        const row = repo.create({
          contentId: input.contentId,
          contentType: input.contentType,
          userId: input.userId,
          emojiKey: input.emojiKey,
        });
        await repo.save(row);
      }

      await this.events.enqueueReactionChanged(manager, {
        topicId,
        contentId: input.contentId,
        contentType: input.contentType,
        userId: input.userId,
        emojiKey,
        cleared,
      });

      if (cleared) return { emojiKey: null, cleared: true, updated: false };
      return { reactionId: input.contentId, emojiKey: input.emojiKey, updated };
    });

    this.events.flush();
    return result;
  }

  async clear(input: {
    contentId: string;
    contentType: ForumContentType;
    userId: string;
  }) {
    const topicId = await this.resolveTopicId(input.contentId, input.contentType);

    const result = await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(ReactionEntity);
      const existing = await repo.findOne({
        where: {
          contentId: input.contentId,
          contentType: input.contentType,
          userId: input.userId,
        },
      });
      if (!existing) return { cleared: false };

      await repo.remove(existing);
      await this.events.enqueueReactionChanged(manager, {
        topicId,
        contentId: input.contentId,
        contentType: input.contentType,
        userId: input.userId,
        emojiKey: null,
        cleared: true,
      });
      return { cleared: true };
    });

    if (result.cleared) this.events.flush();
    return result;
  }

  private async resolveTopicId(
    contentId: string,
    contentType: ForumContentType,
  ): Promise<string> {
    if (contentType === 'topic') {
      const topic = await this.topics.findOne({ where: { id: contentId } });
      if (!topic || topic.deletedAt) {
        throw new NotFoundException({
          type: 'not-found',
          detail: `Topic ${contentId} not found`,
        });
      }
      return topic.id;
    }

    const comment = await this.comments.findOne({ where: { id: contentId } });
    if (!comment || comment.deletedAt) {
      throw new NotFoundException({
        type: 'not-found',
        detail: `Comment ${contentId} not found`,
      });
    }
    return comment.topicId;
  }
}
