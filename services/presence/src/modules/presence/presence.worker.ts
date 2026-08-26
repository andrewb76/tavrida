import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { InfluxService } from '../influx/influx.service';
import { PresenceService } from './presence.service';

@Injectable()
export class PresenceWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PresenceWorker.name);
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly redis: RedisService,
    private readonly influx: InfluxService,
    private readonly presence: PresenceService,
  ) {}

  onModuleInit(): void {
    const intervalMs = Number(process.env.PRESENCE_EVALUATE_INTERVAL_MS ?? 30_000);
    this.timer = setInterval(() => void this.evaluateStaleUsers(), intervalMs);
    this.logger.log(`PresenceWorker started (interval ${intervalMs}ms)`);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private async evaluateStaleUsers(): Promise<void> {
    try {
      const keys = await this.redis.scanAll();
      const userIds = keys
        .map((k) => k.replace(/^presence:/, ''))
        .filter((k) => k.length > 0);

      if (userIds.length === 0) return;

      const map = await this.redis.batch(userIds);
      let online = 0;
      let away = 0;
      let offline = 0;

      for (const [userId, record] of map) {
        const effective = this.resolveEffectiveStatus(record);
        if (effective !== record.status) {
          await this.presence.evaluateAndTransition(userId, record);
        }
        switch (effective) {
          case 'online': online++; break;
          case 'away': away++; break;
          default: offline++; break;
        }
      }

      this.influx.writeSnapshot({ online, away, offline });
    } catch (err) {
      this.logger.error('PresenceWorker evaluateStaleUsers failed', err);
    }
  }

  private resolveEffectiveStatus(record: { status: string; lastSeen: string; visibility: string; lastActivityAt: string | null }): 'online' | 'away' | 'offline' {
    const now = Date.now();
    const lastSeen = new Date(record.lastSeen).getTime();
    const onlineTimeout = Number(process.env.PRESENCE_ONLINE_TIMEOUT_SECONDS ?? 90) * 1000;

    if (now - lastSeen > onlineTimeout) return 'offline';

    if (record.visibility === 'hidden' || !record.lastActivityAt) {
      const lastActivity = record.lastActivityAt
        ? new Date(record.lastActivityAt).getTime()
        : lastSeen;
      const awayThreshold = Number(process.env.PRESENCE_AWAY_AFTER_SECONDS ?? 300) * 1000;
      if (now - lastActivity > awayThreshold) return 'away';
    }

    return record.status === 'away' ? 'away' : 'online';
  }
}
