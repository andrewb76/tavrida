import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

export interface PresenceRecord {
  status: 'online' | 'away' | 'offline';
  lastSeen: string;
  visibility: 'visible' | 'hidden';
  lastActivityAt: string | null;
}

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;
  private readonly logger = new Logger(RedisService.name);

  constructor() {
    this.client = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
    });
    this.client.on('error', (err) => this.logger.error('Redis error', err));
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }

  async ping(): Promise<string> {
    const result = await this.client.ping();
    if (result !== 'PONG') throw new Error('Redis ping failed');
    return result;
  }

  private key(userId: string): string {
    return `presence:${userId}`;
  }

  async get(userId: string): Promise<PresenceRecord | null> {
    const data = await this.client.hgetall(this.key(userId));
    if (!data.status) return null;
    return {
      status: data.status as PresenceRecord['status'],
      lastSeen: data.lastSeen,
      visibility: (data.visibility as PresenceRecord['visibility']) ?? 'visible',
      lastActivityAt: data.lastActivityAt ?? null,
    };
  }

  async set(
    userId: string,
    status: PresenceRecord['status'],
    visibility: PresenceRecord['visibility'],
    lastActivityAt: string | null,
  ): Promise<PresenceRecord> {
    const now = new Date().toISOString();
    const record: PresenceRecord = {
      status,
      lastSeen: now,
      visibility,
      lastActivityAt,
    };
    await this.client.hset(this.key(userId), {
      status: record.status,
      lastSeen: record.lastSeen,
      visibility: record.visibility,
      lastActivityAt: record.lastActivityAt ?? '',
    });
    return record;
  }

  async batch(userIds: string[]): Promise<Map<string, PresenceRecord>> {
    const pipeline = this.client.pipeline();
    for (const id of userIds) {
      pipeline.hgetall(this.key(id));
    }
    const results = await pipeline.exec();
    const map = new Map<string, PresenceRecord>();
    userIds.forEach((id, i) => {
      const err = results?.[i]?.[0];
      const data = results?.[i]?.[1] as Record<string, string> | null;
      if (err || !data?.status) return;
      map.set(id, {
        status: data.status as PresenceRecord['status'],
        lastSeen: data.lastSeen,
        visibility: (data.visibility as PresenceRecord['visibility']) ?? 'visible',
        lastActivityAt: data.lastActivityAt || null,
      });
    });
    return map;
  }

  /** Return all keys matching presence:* — used by background worker */
  async scanAll(): Promise<string[]> {
    const keys: string[] = [];
    let cursor = '0';
    do {
      const [next, batch] = await this.client.scan(cursor, 'MATCH', 'presence:*', 'COUNT', 200);
      cursor = next;
      keys.push(...batch);
    } while (cursor !== '0');
    return keys;
  }

  async del(userId: string): Promise<void> {
    await this.client.del(this.key(userId));
  }
}
