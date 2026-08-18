import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import {
  acceptAttributeForDomain,
  isAllowedContentType,
  type MediaDomain,
  type MediaLimits,
} from '@tavrida/object-storage';
import { PlanConfigClient } from '../plan-config/plan-config.client';
import { AuctionSettingsReader } from '../scalar-config/auction-settings.reader';

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
  chat: {
    count: 'chat.member.attachment.countMax',
    size: 'chat.member.attachment.sizeMaxMb',
  },
  profile: {
    count: 'profile.avatar.countMax',
    size: 'profile.avatar.sizeMaxMb',
  },
};

@Injectable()
export class MediaLimitsService {
  constructor(
    private readonly planConfig: PlanConfigClient,
    private readonly auctionSettings: AuctionSettingsReader,
  ) {}

  async getLimits(userId: string, domain: MediaDomain): Promise<MediaLimits & { accept: string }> {
    const keys = DOMAIN_KEYS[domain];
    const [countRaw, sizeRaw] = await Promise.all([
      this.planConfig.resolveLimitValue(userId, keys.count),
      this.planConfig.resolveLimitValue(userId, keys.size),
    ]);

    const PROFILE_DEFAULTS: Record<string, { count: number; size: number }> = {
      'profile': { count: 1, size: 5 },
    };

    const defaults = PROFILE_DEFAULTS[domain] ?? null;
    const countFinal = countRaw ?? defaults?.count ?? null;
    const sizeFinal = sizeRaw ?? defaults?.size ?? null;

    if (sizeFinal == null || sizeFinal < 0) {
      throw new ServiceUnavailableException({
        type: 'plan_policy_unavailable',
        detail: `Media size policy for ${domain} is not enforceable`,
      });
    }
    const countMax = countFinal == null || countFinal === -1 ? 999 : Math.max(0, countFinal);
    const sizeMaxMb = sizeFinal;
    const sizeMaxBytes = sizeMaxMb * 1024 * 1024;

    const base: MediaLimits & { accept: string } = {
      countMax,
      sizeMaxMb,
      sizeMaxBytes,
      accept: acceptAttributeForDomain(domain),
    };

    if (domain === 'auction') {
      const aspect = await this.auctionSettings.lotImageAspect();
      base.aspectWidth = aspect.aspectWidth;
      base.aspectHeight = aspect.aspectHeight;
    }

    return base;
  }

  isAllowedContentType(domain: MediaDomain, contentType: string): boolean {
    return isAllowedContentType(domain, contentType);
  }
}
