import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisSubscriberService implements OnModuleInit, OnModuleDestroy {
  private subscriber: Redis;
  private readonly logger = new Logger(RedisSubscriberService.name);
  private callbacks: Map<string, Set<(message: any) => void>> = new Map();

  constructor(private readonly redisUrl: string) {}

  async onModuleInit() {
    this.subscriber = new Redis(this.redisUrl);
    this.subscriber.on('message', (channel, message) => {
      const callbacks = this.callbacks.get(channel);
      if (callbacks) {
        try {
          const data = JSON.parse(message);
          callbacks.forEach(cb => cb(data));
        } catch (e) {
          this.logger.error('Failed to parse Redis message', e);
        }
      }
    });
    this.subscriber.on('connect', () => this.logger.log('Redis subscriber connected'));
    this.subscriber.on('error', (err) => this.logger.error('Redis subscriber error', err));
  }

  subscribe(channel: string, callback: (message: any) => void) {
    console.log('!!!!!! SBSCRIBE  2do');
    // if (!this.subscriber) {
    //   throw new Error('Redis subscriber not initialized');
    // }
    
    // if (!this.callbacks.has(channel)) {
    //   this.callbacks.set(channel, new Set());
    //   this.subscriber.subscribe(channel);
    // }
    // this.callbacks.get(channel)!.add(callback);
  }

  unsubscribe(channel: string, callback: (message: any) => void) {
    const set = this.callbacks.get(channel);
    if (set) {
      set.delete(callback);
      if (set.size === 0) {
        this.subscriber.unsubscribe(channel);
        this.callbacks.delete(channel);
      }
    }
  }

  async onModuleDestroy() {
    await this.subscriber.quit();
  }
}
