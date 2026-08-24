import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoryEntity } from '../../entities/category.entity';
import { TopicEntity } from '../../entities/topic.entity';
import { TopicViewEntity } from '../../entities/topic-view.entity';
import { CategoriesModule } from '../categories/categories.module';
import { ForumEventsModule } from '../events/forum-events.module';
import { TagsModule } from '../tags/tags.module';
import { VotesModule } from '../votes/votes.module';
import { InternalTopicsController } from './internal-topics.controller';
import { TopicViewsService } from './topic-views.service';
import { TopicsService } from './topics.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([TopicEntity, CategoryEntity, TopicViewEntity]),
    CategoriesModule,
    VotesModule,
    TagsModule,
    ForumEventsModule,
  ],
  controllers: [InternalTopicsController],
  providers: [TopicsService, TopicViewsService],
  exports: [TopicsService, TopicViewsService],
})
export class TopicsModule {}
