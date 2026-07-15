import { Injectable, Logger } from '@nestjs/common';
import { AuctionClient } from '../auction/auction.client';
import { ForumClient } from '../forum/forum.client';
import {
  collectEnrichmentIds,
  enrichSubscriptionRows,
  metaKey,
  type EnrichedSubscription,
  type SubscriptionRow,
  type TargetMeta,
} from './subscription-titles.logic';
import type { SubscriptionDto } from './subscriptions.client';

@Injectable()
export class SubscriptionTitlesService {
  private readonly logger = new Logger(SubscriptionTitlesService.name);

  constructor(
    private readonly forum: ForumClient,
    private readonly auction: AuctionClient,
  ) {}

  async enrichList(rows: SubscriptionDto[]): Promise<EnrichedSubscription[]> {
    const typed = rows as SubscriptionRow[];
    const { topicIds, tagIds, auctionIds } = collectEnrichmentIds(typed);
    const meta = new Map<string, TargetMeta>();

    await Promise.all([
      this.fillTopics(topicIds, meta),
      this.fillTags(tagIds, meta),
      this.fillAuctions(auctionIds, meta),
    ]);

    return enrichSubscriptionRows(typed, meta);
  }

  private async fillTopics(ids: string[], meta: Map<string, TargetMeta>) {
    await Promise.all(
      ids.map(async (id) => {
        try {
          const topic = await this.forum.getTopic(id);
          const title = typeof topic.title === 'string' ? topic.title : null;
          meta.set(metaKey('FORUM_TOPIC', id), { title, slug: null });
        } catch (error) {
          this.logger.debug(
            `topic title ${id}: ${error instanceof Error ? error.message : error}`,
          );
        }
      }),
    );
  }

  private async fillTags(ids: string[], meta: Map<string, TargetMeta>) {
    if (!ids.length) return;
    try {
      const { data } = await this.forum.getTagsByIds(ids);
      for (const raw of data) {
        const tag = raw as { id?: string; displayName?: string; slug?: string };
        if (!tag.id) continue;
        meta.set(metaKey('TAG', tag.id), {
          title: typeof tag.displayName === 'string' ? tag.displayName : null,
          slug: typeof tag.slug === 'string' ? tag.slug : null,
        });
      }
    } catch (error) {
      this.logger.debug(`tags by-ids: ${error instanceof Error ? error.message : error}`);
    }
  }

  private async fillAuctions(ids: string[], meta: Map<string, TargetMeta>) {
    await Promise.all(
      ids.map(async (id) => {
        try {
          const lot = await this.auction.getAuction(id);
          const title = typeof lot.title === 'string' ? lot.title : null;
          meta.set(metaKey('AUCTION', id), { title, slug: null });
        } catch (error) {
          this.logger.debug(
            `auction title ${id}: ${error instanceof Error ? error.message : error}`,
          );
        }
      }),
    );
  }
}
