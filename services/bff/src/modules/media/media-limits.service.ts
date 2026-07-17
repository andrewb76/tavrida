import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import {
  acceptAttributeForDomain,
  isAllowedContentType,
  type MediaDomain,
  type MediaLimits,
} from '@tavrida/object-storage';
import { PlanConfigClient } from '../plan-config/plan-config.client';

const DOMAIN_KEYS: Record<MediaDomain, { count: string; size: string }> = {
  auction: {
    count: 'auction.seller.image.countMax',
    size: 'auction.seller.image.sizeMaxMb',
  },
  forum: {
    count: 'forum.author.attachment.countMax',
    size: 'forum.author.attachment.sizeMaxMb',
  },
  marketplace: {
    count: 'marketplace.seller.portfolio.itemMax',
    size: 'marketplace.seller.portfolio.image.sizeMaxMb',
  },
};

@Injectable()
export class MediaLimitsService {
  constructor(private readonly planConfig: PlanConfigClient) {}

  async getLimits(userId: string, domain: MediaDomain): Promise<MediaLimits & { accept: string }> {
    const keys = DOMAIN_KEYS[domain];
    const [countRaw, sizeRaw] = await Promise.all([
      this.planConfig.resolveLimitValue(userId, keys.count),
      this.planConfig.resolveLimitValue(userId, keys.size),
    ]);

    if (sizeRaw == null || sizeRaw < 0) {
      throw new ServiceUnavailableException({
        type: 'plan_policy_unavailable',
        detail: `Media size policy for ${domain} is not enforceable`,
      });
    }
    const countMax = countRaw == null || countRaw === -1 ? 999 : Math.max(0, countRaw);
    const sizeMaxMb = sizeRaw;
    const sizeMaxBytes = sizeMaxMb * 1024 * 1024;

    return {
      countMax,
      sizeMaxMb,
      sizeMaxBytes,
      accept: acceptAttributeForDomain(domain),
    };
  }

  isAllowedContentType(domain: MediaDomain, contentType: string): boolean {
    return isAllowedContentType(domain, contentType);
  }
}
