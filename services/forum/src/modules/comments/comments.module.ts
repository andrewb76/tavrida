import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommentClosureEntity } from '../../entities/comment-closure.entity';
import { CommentEntity } from '../../entities/comment.entity';
import { TopicEntity } from '../../entities/topic.entity';
import { VotesModule } from '../votes/votes.module';
import { CommentsService } from './comments.service';
import { InternalCommentsController } from './internal-comments.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([CommentEntity, CommentClosureEntity, TopicEntity]),
    VotesModule,
  ],
  controllers: [InternalCommentsController],
  providers: [CommentsService],
})
export class CommentsModule {}
