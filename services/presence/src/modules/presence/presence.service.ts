import { Injectable, Logger } from '@nestjs/common';
import { RedisService, PresenceRecord } from '../redis/redis.service';
import { InfluxService } from '../influx/influx.service';

export type PresenceStatus = 'online' | 'away' | 'offline';

@Injectable()
export class PresenceService {
  private readonly logger = new Logger(PresenceService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly influx: InfluxService,
  ) {}

  async heartbeat(
    userId: string,
    visibility: 'visible' | 'hidden' = 'visible',
    lastActivityAt?: string,
  ): Promise<void> {
    const prev = await this.redis.get(userId);
    await this.redis.set(userId, 'online', visibility, lastActivityAt ?? new Date().toISOString());

    if (prev?.status !== 'online') {
      this.influx.writePresenceChange(userId, 'online');
      this.logger.debug(`User ${userId} → online`);
    }
  }

  async setVisibility(userId: string, visibility: 'visible' | 'hidden'): Promise<void> {
    const prev = await this.redis.get(userId);
    if (!prev) return;

    await this.redis.set(userId, prev.status, visibility, prev.lastActivityAt);

    if (visibility === 'hidden' && prev.status === 'online') {
      const awayThreshold = this.getAwayThresholdSeconds();
      const lastActivity = prev.lastActivityAt ? new Date(prev.lastActivityAt).getTime() : new Date(prev.lastSeen).getTime();
      const elapsed = (Date.now() - lastActivity) / 1000;

      if (elapsed >= awayThreshold) {
        await this.transitionToAway(userId, prev);
      }
    }
  }

  async getStatus(userId: string): Promise<{ user_id: string; status: PresenceStatus; last_seen: string | null }> {
    const record = await this.redis.get(userId);
    if (!record) {
      return { user_id: userId, status: 'offline', last_seen: null };
    }
    return {
      user_id: userId,
      status: this.resolveEffectiveStatus(record),
      last_seen: record.lastSeen,
    };
  }

  async batch(userIds: string[]): Promise<{ user_id: string; status: PresenceStatus; last_seen: string | null }[]> {
    const map = await this.redis.batch(userIds);
    return userIds.map((id) => {
      const record = map.get(id);
      if (!record) {
        return { user_id: id, status: 'offline' as const, last_seen: null };
      }
      return {
        user_id: id,
        status: this.resolveEffectiveStatus(record),
        last_seen: record.lastSeen,
      };
    });
  }

  /** Called by background worker to check and transition stale users */
  async evaluateAndTransition(userId: string, record: PresenceRecord): Promise<void> {
    const now = Date.now();
    const lastSeen = new Date(record.lastSeen).getTime();
    const onlineTimeout = this.getOnlineTimeoutSeconds() * 1000;

    if (now - lastSeen > onlineTimeout) {
      await this.transitionToOffline(userId, record);
      return;
    }

    if (record.visibility === 'hidden' || !record.lastActivityAt) {
      const lastActivity = record.lastActivityAt
        ? new Date(record.lastActivityAt).getTime()
        : lastSeen;
      const awayThreshold = this.getAwayThresholdSeconds() * 1000;

      if (now - lastActivity > awayThreshold && record.status !== 'away') {
        await this.transitionToAway(userId, record);
      }
    }
  }

  private resolveEffectiveStatus(record: PresenceRecord): PresenceStatus {
    const now = Date.now();
    const lastSeen = new Date(record.lastSeen).getTime();
    const onlineTimeout = this.getOnlineTimeoutSeconds() * 1000;

    if (now - lastSeen > onlineTimeout) return 'offline';

    if (record.visibility === 'hidden' || !record.lastActivityAt) {
      const lastActivity = record.lastActivityAt
        ? new Date(record.lastActivityAt).getTime()
        : lastSeen;
      const awayThreshold = this.getAwayThresholdSeconds() * 1000;
      if (now - lastActivity > awayThreshold) return 'away';
    }

    return record.status === 'away' ? 'away' : 'online';
  }

  private async transitionToAway(userId: string, prev: PresenceRecord): Promise<void> {
    await this.redis.set(userId, 'away', prev.visibility, prev.lastActivityAt);
    this.influx.writePresenceChange(userId, 'away');
    this.logger.debug(`User ${userId} → away`);
  }

  private async transitionToOffline(userId: string, prev: PresenceRecord): Promise<void> {
    if (prev.lastSeen) {
      const duration = (Date.now() - new Date(prev.lastSeen).getTime()) / 1000;
      if (duration > 0) {
        this.influx.writeSessionDuration(userId, duration);
      }
    }
    await this.redis.setStatus(userId, 'offline');
    await this.redis.expire(userId, this.getOfflineRetentionSeconds());
    this.influx.writePresenceChange(userId, 'offline');
    this.logger.debug(`User ${userId} → offline`);
  }

  private getOnlineTimeoutSeconds(): number {
    return Number(process.env.PRESENCE_ONLINE_TIMEOUT_SECONDS ?? 90);
  }

  private getAwayThresholdSeconds(): number {
    return Number(process.env.PRESENCE_AWAY_AFTER_SECONDS ?? 300);
  }

  private getOfflineRetentionSeconds(): number {
    return Number(process.env.PRESENCE_OFFLINE_RETENTION_SECONDS ?? 86400);
  }
}
