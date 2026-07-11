import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { resolve } from 'node:path';
import { HealthController } from './modules/health/health.controller';
import { InvitesModule } from './modules/invites/invites.module';
import { MeModule } from './modules/me/me.module';
import { SettingsModule } from './modules/settings/settings.module';
import { KetoModule } from './modules/keto/keto.module';

const repoRootEnv = (file: string) => resolve(__dirname, '../../..', file);

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [repoRootEnv('.env.local'), repoRootEnv('.env')],
    }),
    KetoModule,
    MeModule,
    SettingsModule,
    InvitesModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
