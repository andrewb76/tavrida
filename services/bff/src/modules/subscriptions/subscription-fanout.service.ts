import { Injectable, Logger } from '@nestjs/common';
import { NotificationsClient } from '../notifications/notifications.client';
import { SubscriptionsClient } from './subscriptions.client';
import {
  collectMatchedUserIds,
  toFanoutResult,
  type FanoutResult,
} from './subscription-fanout.logic';

export type { FanoutResult };

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
    const batches: string[][] = [];

    for (const tagId of input.tagIds) {
      try {
        const { userIds } = await this.subscriptions.match('tag.content_tagged', { tagId });
        batches.push(userIds);
      } catch (error) {
        this.logger.warn(
          `tag.content_tagged match failed (${tagId}): ${
            error instanceof Error ? error.message : error
          }`,
        );
      }
    }

    const matchedUserIds = collectMatchedUserIds(batches, input.excludeUserIds ?? []);

    let notified = 0;
    for (const userId of matchedUserIds) {
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

    const result = toFanoutResult(matchedUserIds.length, notified);
    if (matchedUserIds.length) {
      this.logger.log(
        `tag.content_tagged topic=${input.topicId} tags=${input.tagIds.length} ` +
          `matched=${matchedUserIds.length} notified=${notified} skipped=${result.skipped}`,
      );
    }

    return result;
  }
}
