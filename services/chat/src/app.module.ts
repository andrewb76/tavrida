import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OutboxMessageEntity } from '@tavrida/outbox';
import { resolve } from 'node:path';
import { ChatMemberEntity } from './entities/chat-member.entity';
import { ChatEntity } from './entities/chat.entity';
import { MessageAttachmentEntity } from './entities/message-attachment.entity';
import { MessageEntity } from './entities/message.entity';
import { ChatsModule } from './modules/chats/chats.module';
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
      schema: 'chat',
      entities: [
        ChatEntity,
        ChatMemberEntity,
        MessageEntity,
        MessageAttachmentEntity,
        OutboxMessageEntity,
      ],
      migrations: [resolve(__dirname, 'migrations', '*.{js,ts}')],
      migrationsTableName: 'chat_migrations',
      migrationsRun: process.env.NODE_ENV === 'production',
      synchronize: process.env.NODE_ENV !== 'production',
    }),
    ChatsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
