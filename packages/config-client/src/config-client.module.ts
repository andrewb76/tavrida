import { Module, DynamicModule } from '@nestjs/common';
import { HttpModule, HttpService } from '@nestjs/axios';
import { ConfigClientService } from './config-client.service';
import { RedisSubscriberService } from './redis-subscriber.service';
import { ConfigClientOptions } from './config-client.interface';

@Module({})
export class ConfigClientModule {
  static register(options: ConfigClientOptions): DynamicModule {
    return {
      module: ConfigClientModule,
      imports: [HttpModule],
      providers: [
        {
          provide: ConfigClientService,
          useFactory: (httpService: HttpService) => {
            const redisUrl = options.redisUrl || process.env.REDIS_URL || 'redis://localhost:6379';
            const redisSubscriber = new RedisSubscriberService(redisUrl);
            return new ConfigClientService(options, httpService, redisSubscriber);
          },
          inject: [HttpService],
        },
        {
          provide: RedisSubscriberService,
          useFactory: () => {
            const redisUrl = options.redisUrl || process.env.REDIS_URL || 'redis://localhost:6379';
            return new RedisSubscriberService(redisUrl);
          },
        },
      ],
      exports: [ConfigClientService, RedisSubscriberService],
    };
  }
}