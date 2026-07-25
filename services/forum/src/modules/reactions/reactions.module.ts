import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommentEntity } from '../../entities/comment.entity';
import { ReactionEntity } from '../../entities/reaction.entity';
import { TopicEntity } from '../../entities/topic.entity';
import { ForumEventsModule } from '../events/forum-events.module';
import { InternalReactionsController } from './internal-reactions.controller';
import { ReactionsService } from './reactions.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ReactionEntity, CommentEntity, TopicEntity]),
    ForumEventsModule,
  ],
  controllers: [InternalReactionsController],
  providers: [ReactionsService],
})
export class ReactionsModule {}
