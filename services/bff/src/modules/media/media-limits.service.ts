import { Injectable } from '@nestjs/common';
import {
  acceptAttributeForDomain,
  isAllowedContentType,
  normalizeCountLimit,
  sizeLimitToBytes,
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

const COUNT_FALLBACK: Record<MediaDomain, number> = {
  auction: 3,
  forum: 1,
  marketplace: 5,
};

const SIZE_FALLBACK_MB: Record<MediaDomain, number> = {
  auction: 3,
  forum: 2,
  marketplace: 3,
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

    const countMax = normalizeCountLimit(countRaw, COUNT_FALLBACK[domain]);
    const sizeMaxMb = sizeRaw == null || sizeRaw <= 0 ? SIZE_FALLBACK_MB[domain] : sizeRaw;
    const sizeMaxBytes = sizeLimitToBytes(sizeMaxMb, SIZE_FALLBACK_MB[domain]);

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
