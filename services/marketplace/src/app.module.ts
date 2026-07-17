import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OutboxMessageEntity } from '@tavrida/outbox';
import { resolve } from 'node:path';
import { PortfolioItemEntity } from './entities/portfolio-item.entity';
import { ServiceListingEntity } from './entities/service-listing.entity';
import { ServiceOrderEntity } from './entities/service-order.entity';
import { HealthController } from './modules/health/health.controller';
import { MarketplaceDomainModule } from './modules/marketplace/marketplace.module';
import { SeedModule } from './modules/seed/seed.module';

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
      schema: 'marketplace',
      entities: [
        ServiceListingEntity,
        PortfolioItemEntity,
        ServiceOrderEntity,
        OutboxMessageEntity,
      ],
      migrations: [resolve(__dirname, 'migrations', '*.{js,ts}')],
      migrationsTableName: 'marketplace_migrations',
      migrationsRun: process.env.NODE_ENV === 'production',
      synchronize: process.env.NODE_ENV !== 'production',
    }),
    MarketplaceDomainModule,
    SeedModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
