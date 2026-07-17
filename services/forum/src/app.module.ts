import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OutboxMessageEntity } from '@tavrida/outbox';
import { resolve } from 'node:path';
import { CategoryEntity } from './entities/category.entity';
import { CommentClosureEntity } from './entities/comment-closure.entity';
import { CommentEntity } from './entities/comment.entity';
import { ContentTagEntity } from './entities/content-tag.entity';
import { ContentVoteEntity } from './entities/content-vote.entity';
import { ReactionEntity } from './entities/reaction.entity';
import { TagEntity } from './entities/tag.entity';
import { TopicEntity } from './entities/topic.entity';
import { CategoriesModule } from './modules/categories/categories.module';
import { CommentsModule } from './modules/comments/comments.module';
import { HealthController } from './modules/health/health.controller';
import { ReactionsModule } from './modules/reactions/reactions.module';
import { SeedModule } from './modules/seed/seed.module';
import { TagsModule } from './modules/tags/tags.module';
import { TopicsModule } from './modules/topics/topics.module';
import { VotesModule } from './modules/votes/votes.module';

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
      schema: 'forum',
      entities: [
        CategoryEntity,
        TopicEntity,
        CommentEntity,
        CommentClosureEntity,
        ReactionEntity,
        ContentVoteEntity,
        TagEntity,
        ContentTagEntity,
        OutboxMessageEntity,
      ],
      migrations: [resolve(__dirname, 'migrations', '*.{js,ts}')],
      migrationsTableName: 'forum_migrations',
      migrationsRun: process.env.NODE_ENV === 'production',
      synchronize: process.env.NODE_ENV !== 'production',
    }),
    CategoriesModule,
    TopicsModule,
    CommentsModule,
    ReactionsModule,
    VotesModule,
    TagsModule,
    SeedModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
