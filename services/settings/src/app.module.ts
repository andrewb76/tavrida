import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { resolve } from 'node:path';
import { SettingEntity } from './entities/setting.entity';
import { SettingKeyEntity } from './entities/setting-key.entity';
import { HealthController } from './modules/health/health.controller';
import { SettingsModule } from './modules/settings/settings.module';

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
      schema: 'settings',
      entities: [SettingEntity, SettingKeyEntity],
      synchronize: process.env.NODE_ENV !== 'production',
    }),
    SettingsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
