import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TopicViewEntity } from '../../entities/topic-view.entity';

@Injectable()
export class TopicViewsService {
  constructor(
    @InjectRepository(TopicViewEntity)
    private readonly topicViews: Repository<TopicViewEntity>,
  ) {}

  async recordView(topicId: string, userId: string): Promise<void> {
    await this.topicViews
      .createQueryBuilder()
      .insert()
      .into(TopicViewEntity)
      .values({ topicId, userId, viewedAt: new Date(), isHidden: false })
      .orIgnore()
      .execute();
  }

  async getViewedTopicIds(
    userId: string,
    topicIds: string[],
  ): Promise<Set<string>> {
    if (topicIds.length === 0) return new Set();
    const rows = await this.topicViews
      .createQueryBuilder('tv')
      .select('tv.topic_id')
      .where('tv.user_id = :userId', { userId })
      .andWhere('tv.topic_id IN (:...topicIds)', { topicIds })
      .getMany();
    return new Set(rows.map((r) => r.topicId));
  }
}
