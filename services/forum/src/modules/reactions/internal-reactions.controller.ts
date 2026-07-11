import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { IsBoolean, IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import type { ForumContentType } from '../../entities/reaction.entity';
import { ReactionsService } from './reactions.service';

class ListReactionsQuery {
  @IsUUID()
  contentId!: string;

  @IsIn(['topic', 'comment'])
  contentType!: ForumContentType;
}

class UpsertReactionDto {
  @IsUUID()
  contentId!: string;

  @IsIn(['topic', 'comment'])
  contentType!: ForumContentType;

  @IsString()
  @MinLength(1)
  @MaxLength(32)
  emojiKey!: string;

  @IsString()
  @MinLength(1)
  userId!: string;

  @IsOptional()
  @IsBoolean()
  allowPaid?: boolean;
}

@Controller('internal/v1/reactions')
export class InternalReactionsController {
  constructor(private readonly reactions: ReactionsService) {}

  @Get()
  list(@Query() query: ListReactionsQuery) {
    return this.reactions.list(query.contentId, query.contentType);
  }

  @Post()
  upsert(@Body() body: UpsertReactionDto) {
    return this.reactions.upsert(body);
  }
}
