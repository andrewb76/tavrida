import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { resolve } from 'node:path';
import { RedisModule } from './modules/redis/redis.module';
import { InfluxModule } from './modules/influx/influx.module';
import { PresenceModule } from './modules/presence/presence.module';
import { HealthController } from './modules/health/health.controller';

const repoRootEnv = (file: string) => resolve(__dirname, '../../..', file);

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [repoRootEnv('.env.local'), repoRootEnv('.env')],
    }),
    RedisModule,
    InfluxModule,
    PresenceModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
