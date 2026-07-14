import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommentEntity } from '../../entities/comment.entity';
import { ContentVoteEntity } from '../../entities/content-vote.entity';
import { TopicEntity } from '../../entities/topic.entity';
import { InternalVotesController } from './internal-votes.controller';
import { VotesService } from './votes.service';

@Module({
  imports: [TypeOrmModule.forFeature([ContentVoteEntity, TopicEntity, CommentEntity])],
  controllers: [InternalVotesController],
  providers: [VotesService],
  exports: [VotesService],
})
export class VotesModule {}
