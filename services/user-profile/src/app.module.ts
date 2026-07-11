import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { resolve } from 'node:path';
import { InvitationEntity } from './entities/invitation.entity';
import { InviteCodeEntity } from './entities/invite-code.entity';
import { UserProfileEntity } from './entities/user-profile.entity';
import { HealthController } from './modules/health/health.controller';
import { InvitesModule } from './modules/invites/invites.module';

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
      schema: 'user_profile',
      entities: [UserProfileEntity, InviteCodeEntity, InvitationEntity],
      synchronize: process.env.NODE_ENV !== 'production',
    }),
    InvitesModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
