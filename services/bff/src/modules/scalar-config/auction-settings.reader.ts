import { Injectable, Logger } from '@nestjs/common';
import type { AuctionSettings } from './scalar-config.client';
import { ScalarConfigClient } from './scalar-config.client';

const CACHE_TTL_MS = 30_000;
const DEFAULT_ASPECT_WIDTH = 4;
const DEFAULT_ASPECT_HEIGHT = 3;
const ASPECT_MIN = 1;
const ASPECT_MAX = 32;

function parseAspectPart(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  const n = Math.trunc(value);
  if (n < ASPECT_MIN || n > ASPECT_MAX) return fallback;
  return n;
}

export type LotImageAspect = {
  aspectWidth: number;
  aspectHeight: number;
};

@Injectable()
export class AuctionSettingsReader {
  private readonly logger = new Logger(AuctionSettingsReader.name);
  private cache: { fetchedAt: number; settings: AuctionSettings | null } | null = null;

  constructor(private readonly scalarConfig: ScalarConfigClient) {}

  clearCache() {
    this.cache = null;
  }

  async lotImageAspect(): Promise<LotImageAspect> {
    const settings = await this.loadAuctionSettings();
    return {
      aspectWidth: parseAspectPart(settings?.['lot.image.aspectWidth'], DEFAULT_ASPECT_WIDTH),
      aspectHeight: parseAspectPart(settings?.['lot.image.aspectHeight'], DEFAULT_ASPECT_HEIGHT),
    };
  }

  private async loadAuctionSettings(): Promise<AuctionSettings | null> {
    const now = Date.now();
    if (this.cache && now - this.cache.fetchedAt < CACHE_TTL_MS) {
      return this.cache.settings;
    }

    try {
      const settings = await this.scalarConfig.getAuctionSettings();
      this.cache = { fetchedAt: now, settings };
      return settings;
    } catch (error) {
      this.logger.warn(
        `auction settings unavailable, using defaults: ${error instanceof Error ? error.message : error}`,
      );
      this.cache = { fetchedAt: now, settings: null };
      return null;
    }
  }
}
