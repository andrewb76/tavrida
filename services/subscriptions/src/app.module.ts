import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { resolve } from 'node:path';
import { DeliveryPreferenceEntity } from './entities/delivery-preference.entity';
import { SubscriptionEntity } from './entities/subscription.entity';
import { HealthController } from './modules/health/health.controller';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';

const repoRootEnv = (file: string) => resolve(__dirname, '../../..', file);

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [repoRootEnv('.env.local'), repoRootEnv('.env')],
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 5432),
      username: process.env.DB_USER ?? 'postgres',
      password: process.env.DB_PASSWORD ?? 'postgres',
      database: process.env.DB_NAME ?? 'tavrida_lot',
      schema: 'subscriptions',
      entities: [SubscriptionEntity, DeliveryPreferenceEntity],
      synchronize: process.env.NODE_ENV !== 'production',
    }),
    SubscriptionsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
