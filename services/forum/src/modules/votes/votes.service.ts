import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { canChangeForumVote } from '../../common/forum-vote-window';
import { CommentEntity } from '../../entities/comment.entity';
import { ContentVoteEntity } from '../../entities/content-vote.entity';
import type { ForumContentType } from '../../entities/reaction.entity';
import { TopicEntity } from '../../entities/topic.entity';

export type VoteSummary = {
  plusCount: number;
  minusCount: number;
  score: number;
  myVote: 1 | -1 | null;
  canChange: boolean;
};

@Injectable()
export class VotesService {
  constructor(
    @InjectRepository(ContentVoteEntity)
    private readonly votes: Repository<ContentVoteEntity>,
    @InjectRepository(TopicEntity)
    private readonly topics: Repository<TopicEntity>,
    @InjectRepository(CommentEntity)
    private readonly comments: Repository<CommentEntity>,
    private readonly dataSource: DataSource,
  ) {}

  summarize(
    plusCount: number,
    minusCount: number,
    myVote: 1 | -1 | null,
    firstVotedAt: Date | null,
    changeWindowMinutes: number,
  ): VoteSummary {
    const canChange =
      myVote == null
        ? true
        : firstVotedAt != null && canChangeForumVote(firstVotedAt, changeWindowMinutes);
    return {
      plusCount,
      minusCount,
      score: plusCount - minusCount,
      myVote,
      canChange: myVote == null ? true : canChange,
    };
  }

  async findMine(
    contentId: string,
    contentType: ForumContentType,
    userId: string | undefined,
  ): Promise<ContentVoteEntity | null> {
    if (!userId) return null;
    return this.votes.findOne({ where: { contentId, contentType, userId } });
  }

  async findMineMany(
    contentType: ForumContentType,
    contentIds: string[],
    userId: string | undefined,
  ): Promise<Map<string, ContentVoteEntity>> {
    const map = new Map<string, ContentVoteEntity>();
    if (!userId || contentIds.length === 0) return map;
    const rows = await this.votes.find({
      where: { contentType, userId, contentId: In(contentIds) },
    });
    for (const row of rows) map.set(row.contentId, row);
    return map;
  }

  async cast(input: {
    contentId: string;
    contentType: ForumContentType;
    userId: string;
    value: 1 | -1;
    changeWindowMinutes: number;
  }) {
    const content = await this.loadContent(input.contentId, input.contentType);
    if (content.authorId === input.userId) {
      throw new ForbiddenException({
        type: 'forbidden',
        detail: 'Нельзя голосовать за свой контент',
      });
    }

    return this.dataSource.transaction(async (manager) => {
      const voteRepo = manager.getRepository(ContentVoteEntity);
      const existing = await voteRepo.findOne({
        where: {
          contentId: input.contentId,
          contentType: input.contentType,
          userId: input.userId,
        },
      });

      if (!existing) {
        await voteRepo.save(
          voteRepo.create({
            contentId: input.contentId,
            contentType: input.contentType,
            userId: input.userId,
            value: input.value,
          }),
        );
        await this.applyCounterDelta(manager, input.contentType, input.contentId, {
          plus: input.value === 1 ? 1 : 0,
          minus: input.value === -1 ? 1 : 0,
        });
      } else if (existing.value === input.value) {
        // Idempotent: already pressed
      } else {
        this.assertCanChange(existing.createdAt, input.changeWindowMinutes);
        const prev = existing.value;
        existing.value = input.value;
        await voteRepo.save(existing);
        await this.applyCounterDelta(manager, input.contentType, input.contentId, {
          plus: (input.value === 1 ? 1 : 0) - (prev === 1 ? 1 : 0),
          minus: (input.value === -1 ? 1 : 0) - (prev === -1 ? 1 : 0),
        });
      }

      const refreshed = await this.loadContentCounters(
        manager,
        input.contentId,
        input.contentType,
      );
      const mine = await voteRepo.findOneOrFail({
        where: {
          contentId: input.contentId,
          contentType: input.contentType,
          userId: input.userId,
        },
      });
      return {
        contentId: input.contentId,
        contentType: input.contentType,
        ...this.summarize(
          refreshed.votePlusCount,
          refreshed.voteMinusCount,
          mine.value,
          mine.createdAt,
          input.changeWindowMinutes,
        ),
      };
    });
  }

  async clear(input: {
    contentId: string;
    contentType: ForumContentType;
    userId: string;
    changeWindowMinutes: number;
  }) {
    return this.dataSource.transaction(async (manager) => {
      const voteRepo = manager.getRepository(ContentVoteEntity);
      const existing = await voteRepo.findOne({
        where: {
          contentId: input.contentId,
          contentType: input.contentType,
          userId: input.userId,
        },
      });
      if (!existing) {
        const refreshed = await this.loadContentCounters(
          manager,
          input.contentId,
          input.contentType,
        );
        return {
          contentId: input.contentId,
          contentType: input.contentType,
          ...this.summarize(
            refreshed.votePlusCount,
            refreshed.voteMinusCount,
            null,
            null,
            input.changeWindowMinutes,
          ),
        };
      }

      this.assertCanChange(existing.createdAt, input.changeWindowMinutes);
      await voteRepo.remove(existing);
      await this.applyCounterDelta(manager, input.contentType, input.contentId, {
        plus: existing.value === 1 ? -1 : 0,
        minus: existing.value === -1 ? -1 : 0,
      });

      const refreshed = await this.loadContentCounters(
        manager,
        input.contentId,
        input.contentType,
      );
      return {
        contentId: input.contentId,
        contentType: input.contentType,
        ...this.summarize(
          refreshed.votePlusCount,
          refreshed.voteMinusCount,
          null,
          null,
          input.changeWindowMinutes,
        ),
      };
    });
  }

  private assertCanChange(firstVotedAt: Date, changeWindowMinutes: number) {
    if (!canChangeForumVote(firstVotedAt, changeWindowMinutes)) {
      throw new ForbiddenException({
        type: 'forbidden',
        detail: 'Окно изменения голоса истекло',
      });
    }
  }

  private async loadContent(contentId: string, contentType: ForumContentType) {
    if (contentType === 'topic') {
      const row = await this.topics.findOne({ where: { id: contentId } });
      if (!row) {
        throw new NotFoundException({ type: 'not-found', detail: `Topic ${contentId} not found` });
      }
      return row;
    }
    const row = await this.comments.findOne({ where: { id: contentId } });
    if (!row) {
      throw new NotFoundException({ type: 'not-found', detail: `Comment ${contentId} not found` });
    }
    return row;
  }

  private async loadContentCounters(
    manager: DataSource['manager'],
    contentId: string,
    contentType: ForumContentType,
  ) {
    if (contentType === 'topic') {
      const row = await manager.getRepository(TopicEntity).findOne({ where: { id: contentId } });
      if (!row) {
        throw new NotFoundException({ type: 'not-found', detail: `Topic ${contentId} not found` });
      }
      return row;
    }
    const row = await manager.getRepository(CommentEntity).findOne({ where: { id: contentId } });
    if (!row) {
      throw new NotFoundException({ type: 'not-found', detail: `Comment ${contentId} not found` });
    }
    return row;
  }

  private async applyCounterDelta(
    manager: DataSource['manager'],
    contentType: ForumContentType,
    contentId: string,
    delta: { plus: number; minus: number },
  ) {
    if (delta.plus === 0 && delta.minus === 0) return;

    if (contentType === 'topic') {
      const row = await manager.getRepository(TopicEntity).findOne({ where: { id: contentId } });
      if (!row) {
        throw new NotFoundException({ type: 'not-found', detail: `Topic ${contentId} not found` });
      }
      row.votePlusCount = Math.max(0, (row.votePlusCount ?? 0) + delta.plus);
      row.voteMinusCount = Math.max(0, (row.voteMinusCount ?? 0) + delta.minus);
      await manager.save(row);
      return;
    }

    if (contentType !== 'comment') {
      throw new BadRequestException({ type: 'validation-error', detail: 'Unknown contentType' });
    }

    const row = await manager.getRepository(CommentEntity).findOne({ where: { id: contentId } });
    if (!row) {
      throw new NotFoundException({ type: 'not-found', detail: `Comment ${contentId} not found` });
    }
    row.votePlusCount = Math.max(0, (row.votePlusCount ?? 0) + delta.plus);
    row.voteMinusCount = Math.max(0, (row.voteMinusCount ?? 0) + delta.minus);
    await manager.save(row);
  }
}
