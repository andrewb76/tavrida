import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContentTagEntity } from '../../entities/content-tag.entity';
import { TagEntity } from '../../entities/tag.entity';
import { TopicEntity } from '../../entities/topic.entity';
import { ForumEventsPublisher } from '../events/forum-events.publisher';
import { InternalTagsController } from './internal-tags.controller';
import { TagsService } from './tags.service';

@Module({
  imports: [TypeOrmModule.forFeature([TagEntity, ContentTagEntity, TopicEntity])],
  controllers: [InternalTagsController],
  providers: [TagsService, ForumEventsPublisher],
  exports: [TagsService],
})
export class TagsModule {}
