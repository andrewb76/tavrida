import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoryEntity } from '../../entities/category.entity';
import { TopicEntity } from '../../entities/topic.entity';
import { CategoriesModule } from '../categories/categories.module';
import { ForumEventsModule } from '../events/forum-events.module';
import { TagsModule } from '../tags/tags.module';
import { VotesModule } from '../votes/votes.module';
import { InternalTopicsController } from './internal-topics.controller';
import { TopicsService } from './topics.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([TopicEntity, CategoryEntity]),
    CategoriesModule,
    VotesModule,
    TagsModule,
    ForumEventsModule,
  ],
  controllers: [InternalTopicsController],
  providers: [TopicsService],
  exports: [TopicsService],
})
export class TopicsModule {}
