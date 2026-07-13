import { Injectable, Logger } from '@nestjs/common';
import type { ForumSettings } from './scalar-config.client';
import { ScalarConfigClient } from './scalar-config.client';

const CACHE_TTL_MS = 30_000;
const DEFAULT_EDIT_WINDOW_MINUTES = 10;

function parseEditWindowMinutes(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return DEFAULT_EDIT_WINDOW_MINUTES;
  return Math.trunc(value);
}

@Injectable()
export class ForumSettingsReader {
  private readonly logger = new Logger(ForumSettingsReader.name);
  private cache: { fetchedAt: number; settings: ForumSettings | null } | null = null;

  constructor(private readonly scalarConfig: ScalarConfigClient) {}

  clearCache() {
    this.cache = null;
  }

  async editWindowMinutes(): Promise<number> {
    const settings = await this.loadForumSettings();
    return parseEditWindowMinutes(settings?.['edit.windowMinutes']);
  }

  private async loadForumSettings(): Promise<ForumSettings | null> {
    const now = Date.now();
    if (this.cache && now - this.cache.fetchedAt < CACHE_TTL_MS) {
      return this.cache.settings;
    }

    try {
      const settings = await this.scalarConfig.getForumSettings();
      this.cache = { fetchedAt: now, settings };
      return settings;
    } catch (error) {
      this.logger.warn(
        `forum settings unavailable, using defaults: ${error instanceof Error ? error.message : error}`,
      );
      this.cache = { fetchedAt: now, settings: null };
      return null;
    }
  }
}
