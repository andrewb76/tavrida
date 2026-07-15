import { Injectable, Logger } from '@nestjs/common';
import { NotificationsClient } from '../notifications/notifications.client';
import { SubscriptionsClient } from './subscriptions.client';

export type FanoutResult = {
  matchedUserIds: string[];
  notified: number;
  skipped: number;
};

@Injectable()
export class SubscriptionFanoutService {
  private readonly logger = new Logger(SubscriptionFanoutService.name);

  constructor(
    private readonly subscriptions: SubscriptionsClient,
    private readonly notifications: NotificationsClient,
  ) {}

  /**
   * For each newly attached tag: match TAG subscribers → trigger `tag-content` workflow.
   * Best-effort; never throws.
   */
  async notifyTagContentTagged(input: {
    tagIds: string[];
    topicId: string;
    contentType: 'topic' | 'comment';
    contentId: string;
    excludeUserIds?: string[];
  }): Promise<FanoutResult> {
    const exclude = new Set(input.excludeUserIds ?? []);
    const matched = new Set<string>();

    for (const tagId of input.tagIds) {
      try {
        const { userIds } = await this.subscriptions.match('tag.content_tagged', { tagId });
        for (const userId of userIds) {
          if (!exclude.has(userId)) matched.add(userId);
        }
      } catch (error) {
        this.logger.warn(
          `tag.content_tagged match failed (${tagId}): ${
            error instanceof Error ? error.message : error
          }`,
        );
      }
    }

    let notified = 0;
    for (const userId of matched) {
      const ok = await this.notifications.trigger({
        userId,
        workflowId: 'tag-content',
        payload: {
          topicId: input.topicId,
          contentType: input.contentType,
          contentId: input.contentId,
          tagIds: input.tagIds,
        },
      });
      if (ok) notified += 1;
    }

    const matchedUserIds = [...matched];
    const skipped = matchedUserIds.length - notified;
    if (matchedUserIds.length) {
      this.logger.log(
        `tag.content_tagged topic=${input.topicId} tags=${input.tagIds.length} ` +
          `matched=${matchedUserIds.length} notified=${notified} skipped=${skipped}`,
      );
    }

    return { matchedUserIds, notified, skipped };
  }
}
