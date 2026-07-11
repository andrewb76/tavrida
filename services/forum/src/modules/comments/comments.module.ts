import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommentClosureEntity } from '../../entities/comment-closure.entity';
import { CommentEntity } from '../../entities/comment.entity';
import { TopicEntity } from '../../entities/topic.entity';
import { CommentsService } from './comments.service';
import { InternalCommentsController } from './internal-comments.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CommentEntity, CommentClosureEntity, TopicEntity])],
  controllers: [InternalCommentsController],
  providers: [CommentsService],
})
export class CommentsModule {}
