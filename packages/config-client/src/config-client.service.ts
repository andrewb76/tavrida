import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { RedisSubscriberService } from './redis-subscriber.service';
import { ConfigClientOptions } from './config-client.interface';

export const errMsg = (err): string => err instanceof Error ? err.message : String(err);

@Injectable()
export class ConfigClientService implements OnModuleInit {
  private cache = new Map<string, any>();
  private readonly logger = new Logger(ConfigClientService.name);
  private initialized = false;
  private syncInProgress = false;

  constructor(
    private readonly options: ConfigClientOptions,
    private readonly httpService: HttpService,
    private readonly redisSubscriber: RedisSubscriberService,
  ) {}

  async onModuleInit() {
    await this.sync();
    this.subscribeToUpdates();
    this.initialized = true;
  }

  private async sync() {
    if (this.syncInProgress) return;
    this.syncInProgress = true;
    try {
      // const url = `${this.options.configServiceUrl || 'http://config-service:3001'}/api/internal/config/${this.options.service}/sync`;
      const url = `${'http://localhost:3011'}/api/internal/config/${this.options.service}/sync`;
      const response = await lastValueFrom(
        this.httpService.post(url, { defaults: this.options.defaults }, {
          headers: {
            'x-internal-token': this.options.internalToken || process.env.INTERNAL_TOKEN,
          },
        })
      );
      const configs = response.data as Array<{ key: string; value: any }>;
      this.cache.clear();
      for (const item of configs) {
        this.cache.set(item.key, item.value);
      }
      this.logger.log(`Synced ${configs.length} configs for service ${this.options.service}`);
    } catch (error) {
      this.logger.error(`Failed to sync configs: ${errMsg(error)}`);
      // Fallback to defaults
      for (const [key, value] of Object.entries(this.options.defaults)) {
        if (!this.cache.has(key)) {
          this.cache.set(key, value);
        }
      }
    } finally {
      this.syncInProgress = false;
    }
  }

  private subscribeToUpdates() {
    this.redisSubscriber.subscribe('config-updates', async (message) => {
      if (message.service === this.options.service) {
        this.logger.log(`Received update for key ${message.key}, reloading...`);
        await this.sync();
      }
    });
  }

  get<T>(key: string): T {
    if (!this.initialized) {
      // Если ещё не инициализировались, возвращаем дефолт
      return this.options.defaults[key] as T;
    }
    return this.cache.get(key) as T;
  }

  getAll(): Map<string, any> {
    return this.cache;
  }

  async reload() {
    await this.sync();
  }
}
