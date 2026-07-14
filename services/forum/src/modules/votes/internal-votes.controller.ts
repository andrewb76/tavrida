import { Body, Controller, Post } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsString, IsUUID, MinLength } from 'class-validator';
import type { ForumContentType } from '../../entities/reaction.entity';
import { VotesService } from './votes.service';

class CastVoteDto {
  @IsUUID()
  contentId!: string;

  @IsIn(['topic', 'comment'])
  contentType!: ForumContentType;

  @IsString()
  @MinLength(1)
  userId!: string;

  @Type(() => Number)
  @IsInt()
  @IsIn([1, -1])
  value!: 1 | -1;

  @Type(() => Number)
  @IsInt()
  changeWindowMinutes!: number;
}

class ClearVoteDto {
  @IsUUID()
  contentId!: string;

  @IsIn(['topic', 'comment'])
  contentType!: ForumContentType;

  @IsString()
  @MinLength(1)
  userId!: string;

  @Type(() => Number)
  @IsInt()
  changeWindowMinutes!: number;
}

@Controller('internal/v1/votes')
export class InternalVotesController {
  constructor(private readonly votes: VotesService) {}

  @Post()
  cast(@Body() body: CastVoteDto) {
    return this.votes.cast(body);
  }

  @Post('clear')
  clear(@Body() body: ClearVoteDto) {
    return this.votes.clear(body);
  }
}
