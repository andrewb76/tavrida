import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { resolve } from 'node:path';
import { HealthController } from './modules/health/health.controller';
import { InvitesModule } from './modules/invites/invites.module';
import { MeModule } from './modules/me/me.module';
import { VangaModule } from './modules/vanga/vanga.module';
import { AdminUsersModule } from './modules/admin-users/admin-users.module';
import { ChargesModule } from './modules/charges/charges.module';
import { PlanConfigAdminModule } from './modules/plan-config-admin/plan-config-admin.module';
import { ProfileModule } from './modules/profile/profile.module';
import { PlansModule } from './modules/plans/plans.module';
import { ScalarConfigModule } from './modules/scalar-config/scalar-config.module';
import { WalletsModule } from './modules/wallets/wallets.module';
import { ForumModule } from './modules/forum/forum.module';
import { AuctionModule } from './modules/auction/auction.module';
import { KetoModule } from './modules/keto/keto.module';
import { AuthModule } from './modules/auth/auth.module';
import { LogtoWebhooksModule } from './modules/logto-webhooks/logto-webhooks.module';
import { MediaModule } from './modules/media/media.module';
import { MediaUploadIntentEntity } from './modules/media/media-upload-intent.entity';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { PeriodsModule } from './modules/periods/periods.module';
import { MarketplaceModule } from './modules/marketplace/marketplace.module';
import { DealFeedbackModule } from './modules/deal-feedback/deal-feedback.module';
import { ChatsModule } from './modules/chats/chats.module';
import { WsModule } from './modules/ws/ws.module';

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
      schema: 'bff',
      entities: [MediaUploadIntentEntity],
      migrations: [resolve(__dirname, 'migrations', '*.{js,ts}')],
      migrationsTableName: 'bff_migrations',
      migrationsRun: process.env.NODE_ENV === 'production',
      synchronize: process.env.NODE_ENV !== 'production',
    }),
    KetoModule,
    AuthModule,
    MeModule,
    ScalarConfigModule,
    InvitesModule,
    VangaModule,
    PlanConfigAdminModule,
    AdminUsersModule,
    ChargesModule,
    PlansModule,
    ProfileModule,
    WalletsModule,
    ForumModule,
    AuctionModule,
    SubscriptionsModule,
    PeriodsModule,
    MarketplaceModule,
    DealFeedbackModule,
    ChatsModule,
    WsModule,
    MediaModule,
    LogtoWebhooksModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
