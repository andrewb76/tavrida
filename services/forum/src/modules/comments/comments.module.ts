import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommentClosureEntity } from '../../entities/comment-closure.entity';
import { CommentEntity } from '../../entities/comment.entity';
import { TopicEntity } from '../../entities/topic.entity';
import { ForumEventsModule } from '../events/forum-events.module';
import { CategoriesModule } from '../categories/categories.module';
import { VotesModule } from '../votes/votes.module';
import { CommentsService } from './comments.service';
import { InternalCommentsController } from './internal-comments.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([CommentEntity, CommentClosureEntity, TopicEntity]),
    CategoriesModule,
    VotesModule,
    ForumEventsModule,
  ],
  controllers: [InternalCommentsController],
  providers: [CommentsService],
})
export class CommentsModule {}
