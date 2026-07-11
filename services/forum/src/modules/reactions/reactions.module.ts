import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReactionEntity } from '../../entities/reaction.entity';
import { InternalReactionsController } from './internal-reactions.controller';
import { ReactionsService } from './reactions.service';

@Module({
  imports: [TypeOrmModule.forFeature([ReactionEntity])],
  controllers: [InternalReactionsController],
  providers: [ReactionsService],
})
export class ReactionsModule {}
