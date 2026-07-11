import { Module } from '@nestjs/common';
import { ForumClient } from './forum.client';
import { ForumController } from './forum.controller';

@Module({
  controllers: [ForumController],
  providers: [ForumClient],
})
export class ForumModule {}
