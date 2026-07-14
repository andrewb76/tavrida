import { Injectable, Logger } from '@nestjs/common';
import type { ForumSettings } from './scalar-config.client';
import { ScalarConfigClient } from './scalar-config.client';

const CACHE_TTL_MS = 30_000;
const DEFAULT_EDIT_WINDOW_MINUTES = 10;
const DEFAULT_VOTE_CHANGE_WINDOW_MINUTES = 3;
const DEFAULT_VOTE_KARMA_WEIGHT = 0.2;

function parseWindowMinutes(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.trunc(value);
}

function parseWeight(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return fallback;
  return value;
}

export type ForumVoteKarmaWeights = { plus: number; minus: number };

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
    return parseWindowMinutes(settings?.['edit.windowMinutes'], DEFAULT_EDIT_WINDOW_MINUTES);
  }

  async voteChangeWindowMinutes(): Promise<number> {
    const settings = await this.loadForumSettings();
    return parseWindowMinutes(
      settings?.['vote.changeWindowMinutes'],
      DEFAULT_VOTE_CHANGE_WINDOW_MINUTES,
    );
  }

  async voteKarmaWeights(): Promise<ForumVoteKarmaWeights> {
    const settings = await this.loadForumSettings();
    return {
      plus: parseWeight(settings?.['vote.karmaPlusWeight'], DEFAULT_VOTE_KARMA_WEIGHT),
      minus: parseWeight(settings?.['vote.karmaMinusWeight'], DEFAULT_VOTE_KARMA_WEIGHT),
    };
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
