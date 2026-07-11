import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { resolve } from 'node:path';
import { HealthController } from './modules/health/health.controller';
import { InvitesModule } from './modules/invites/invites.module';
import { MeModule } from './modules/me/me.module';
import { OracleModule } from './modules/oracle/oracle.module';
import { AdminUsersModule } from './modules/admin-users/admin-users.module';
import { ChargesModule } from './modules/charges/charges.module';
import { PlanConfigAdminModule } from './modules/plan-config-admin/plan-config-admin.module';
import { PlansModule } from './modules/plans/plans.module';
import { ScalarConfigModule } from './modules/scalar-config/scalar-config.module';
import { WalletsModule } from './modules/wallets/wallets.module';
import { ForumModule } from './modules/forum/forum.module';
import { AuctionModule } from './modules/auction/auction.module';
import { KetoModule } from './modules/keto/keto.module';
import { LogtoWebhooksModule } from './modules/logto-webhooks/logto-webhooks.module';

const repoRootEnv = (file: string) => resolve(__dirname, '../../..', file);

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [repoRootEnv('.env.local'), repoRootEnv('.env')],
    }),
    KetoModule,
    MeModule,
    ScalarConfigModule,
    InvitesModule,
    OracleModule,
    PlanConfigAdminModule,
    AdminUsersModule,
    ChargesModule,
    PlansModule,
    WalletsModule,
    ForumModule,
    AuctionModule,
    LogtoWebhooksModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
