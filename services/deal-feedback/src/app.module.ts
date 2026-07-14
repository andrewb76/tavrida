import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { resolve } from 'node:path';
import { DealFeedbackEntity } from './entities/deal-feedback.entity';
import { PendingDealFeedbackEntity } from './entities/pending-deal-feedback.entity';
import { ProcessedEventEntity } from './entities/processed-event.entity';
import { FeedbackModule } from './modules/feedback/feedback.module';
import { HealthController } from './modules/health/health.controller';

const repoRootEnv = (file: string) => resolve(__dirname, '../../..', file);
const databaseUrl = process.env.DATABASE_URL?.trim();

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [repoRootEnv('.env.local'), repoRootEnv('.env')],
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      ...(databaseUrl
        ? { url: databaseUrl }
        : {
            host: process.env.DB_HOST ?? 'localhost',
            port: Number(process.env.DB_PORT ?? 5432),
            username: process.env.DB_USER ?? 'postgres',
            password: process.env.DB_PASSWORD ?? 'postgres',
            database: process.env.DB_NAME ?? 'tavrida_lot',
          }),
      schema: 'deal_feedback',
      entities: [DealFeedbackEntity, PendingDealFeedbackEntity, ProcessedEventEntity],
      synchronize: process.env.NODE_ENV !== 'production',
    }),
    FeedbackModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
