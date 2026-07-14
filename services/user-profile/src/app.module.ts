import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { resolve } from 'node:path';
import { InvitationEntity } from './entities/invitation.entity';
import { InviteCodeEntity } from './entities/invite-code.entity';
import { ProfileNoteEntity } from './entities/profile-note.entity';
import { UserProfileEntity } from './entities/user-profile.entity';
import { UserRatingEntity } from './entities/user-rating.entity';
import { ReputationChangeLogEntity } from './entities/reputation-change-log.entity';
import { HealthController } from './modules/health/health.controller';
import { InvitesModule } from './modules/invites/invites.module';
import { NotesModule } from './modules/notes/notes.module';
import { RatingsModule } from './modules/ratings/ratings.module';
import { UsersModule } from './modules/users/users.module';

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
      entities: [
        UserProfileEntity,
        InviteCodeEntity,
        InvitationEntity,
        ProfileNoteEntity,
        UserRatingEntity,
        ReputationChangeLogEntity,
      ],
      synchronize: process.env.NODE_ENV !== 'production',
    }),
    InvitesModule,
    UsersModule,
    NotesModule,
    RatingsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
