import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import {
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ForumClient } from './forum.client';

class CreateTopicDto {
  @IsUUID()
  categoryId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(256)
  title!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  body!: string;
}

class CreateCommentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  body!: string;

  @IsOptional()
  @IsUUID()
  parentId?: string;
}

class UpsertReactionDto {
  @IsUUID()
  contentId!: string;

  @IsIn(['topic', 'comment'])
  contentType!: 'topic' | 'comment';

  @IsString()
  @MinLength(1)
  @MaxLength(32)
  emojiKey!: string;
}

@Controller('forum')
export class ForumController {
  constructor(private readonly forum: ForumClient) {}

  @Get('categories')
  listCategories() {
    return this.forum.listCategories();
  }

  @Get('topics')
  listTopics(@Query('categoryId') categoryId?: string, @Query('limit') limit?: string) {
    return this.forum.listTopics({
      categoryId,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('topics/:id')
  getTopic(@Param('id') id: string) {
    return this.forum.getTopic(id);
  }

  @Post('topics')
  @UseGuards(JwtAuthGuard)
  createTopic(@CurrentUser() user: AuthUser, @Body() body: CreateTopicDto) {
    return this.forum.createTopic({ ...body, authorId: user.sub });
  }

  @Get('topics/:id/comments')
  listComments(@Param('id') topicId: string) {
    return this.forum.listComments(topicId);
  }

  @Post('topics/:id/comments')
  @UseGuards(JwtAuthGuard)
  createComment(
    @CurrentUser() user: AuthUser,
    @Param('id') topicId: string,
    @Body() body: CreateCommentDto,
  ) {
    return this.forum.createComment(topicId, { ...body, authorId: user.sub });
  }

  @Get('reactions')
  listReactions(
    @Query('contentId') contentId: string,
    @Query('contentType') contentType: 'topic' | 'comment',
  ) {
    return this.forum.listReactions(contentId, contentType);
  }

  @Post('reactions')
  @UseGuards(JwtAuthGuard)
  upsertReaction(@CurrentUser() user: AuthUser, @Body() body: UpsertReactionDto) {
    return this.forum.upsertReaction({ ...body, userId: user.sub });
  }
}
