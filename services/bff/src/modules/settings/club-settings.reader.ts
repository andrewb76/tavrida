import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ClubSettings } from './settings.client';
import { SettingsClient } from './settings.client';

const DEFAULT_VALIDITY_DAYS = 14;
const CACHE_TTL_MS = 30_000;
const MULTI_USE_MAX = 100;

export type ResolvedClubSettings = {
  registrationInviteOnly: boolean;
  inviteValidityDays: number;
  inviteCodeType: 'SINGLE_USE' | 'MULTI_USE';
  inviteMaxUses: number;
  landingPublicSections: string[];
  source: 'settings' | 'env-fallback';
};

@Injectable()
export class ClubSettingsReader {
  private readonly logger = new Logger(ClubSettingsReader.name);
  private cache: { fetchedAt: number; settings: ClubSettings } | null = null;

  constructor(
    private readonly settings: SettingsClient,
    private readonly config: ConfigService,
  ) {}

  /** Invalidate after admin PATCH (optional; TTL covers most cases). */
  clearCache() {
    this.cache = null;
  }

  async resolve(): Promise<ResolvedClubSettings> {
    const fromSettings = await this.loadClubSettings();
    return this.mergeWithEnvFallback(fromSettings);
  }

  async inviteValidityDays(): Promise<number> {
    return (await this.resolve()).inviteValidityDays;
  }

  async inviteMaxUses(): Promise<number> {
    return (await this.resolve()).inviteMaxUses;
  }

  async registrationInviteOnly(): Promise<boolean> {
    return (await this.resolve()).registrationInviteOnly;
  }

  private async loadClubSettings(): Promise<ClubSettings | null> {
    const now = Date.now();
    if (this.cache && now - this.cache.fetchedAt < CACHE_TTL_MS) {
      return this.cache.settings;
    }

    try {
      const settings = await this.settings.getClubSettings();
      this.cache = { fetchedAt: now, settings };
      return settings;
    } catch (error) {
      this.logger.warn(
        `club settings unavailable, using env fallback: ${error instanceof Error ? error.message : error}`,
      );
      return null;
    }
  }

  private mergeWithEnvFallback(club: ClubSettings | null): ResolvedClubSettings {
    const envDays = Number(
      this.config.get<string>('CLUB_INVITE_VALIDITY_DAYS') ?? DEFAULT_VALIDITY_DAYS,
    );

    const validityDays =
      typeof club?.['invite.validityDays'] === 'number'
        ? club['invite.validityDays']
        : envDays;

    const codeType = club?.['invite.codeType'] ?? 'SINGLE_USE';
    const inviteMaxUses = codeType === 'MULTI_USE' ? MULTI_USE_MAX : 1;

    return {
      registrationInviteOnly: club?.['registration.inviteOnly'] ?? true,
      inviteValidityDays: validityDays,
      inviteCodeType: codeType,
      inviteMaxUses,
      landingPublicSections:
        club?.['landing.publicSections'] ?? ['about', 'rules', 'request'],
      source: club ? 'settings' : 'env-fallback',
    };
  }
}
