import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { ForumContentType } from '../../entities/reaction.entity';
import { ReactionEntity } from '../../entities/reaction.entity';

const FREE_EMOJI_KEYS = new Set(['+1', '-1', 'heart', 'surprised', 'thinking']);

@Injectable()
export class ReactionsService {
  constructor(
    @InjectRepository(ReactionEntity)
    private readonly reactions: Repository<ReactionEntity>,
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

    const existing = await this.reactions.findOne({
      where: {
        contentId: input.contentId,
        contentType: input.contentType,
        userId: input.userId,
      },
    });

    if (existing) {
      if (existing.emojiKey === input.emojiKey) {
        await this.reactions.remove(existing);
        return { emojiKey: null, cleared: true, updated: false };
      }
      existing.emojiKey = input.emojiKey;
      await this.reactions.save(existing);
      return { reactionId: existing.contentId, emojiKey: existing.emojiKey, updated: true };
    }

    const row = this.reactions.create({
      contentId: input.contentId,
      contentType: input.contentType,
      userId: input.userId,
      emojiKey: input.emojiKey,
    });
    await this.reactions.save(row);
    return { reactionId: row.contentId, emojiKey: row.emojiKey, updated: false };
  }

  async clear(input: {
    contentId: string;
    contentType: ForumContentType;
    userId: string;
  }) {
    const existing = await this.reactions.findOne({
      where: {
        contentId: input.contentId,
        contentType: input.contentType,
        userId: input.userId,
      },
    });
    if (!existing) return { cleared: false };
    await this.reactions.remove(existing);
    return { cleared: true };
  }
}
