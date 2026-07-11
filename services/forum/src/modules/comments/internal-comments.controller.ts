import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { CommentsService } from './comments.service';

class CreateCommentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  body!: string;

  @IsOptional()
  @IsUUID()
  parentId?: string;
}

class CreateCommentRequestDto extends CreateCommentDto {
  @IsString()
  @MinLength(1)
  authorId!: string;
}

@Controller('internal/v1/topics/:topicId/comments')
export class InternalCommentsController {
  constructor(private readonly comments: CommentsService) {}

  @Get()
  list(@Param('topicId') topicId: string) {
    return this.comments.listByTopic(topicId);
  }

  @Post()
  create(@Param('topicId') topicId: string, @Body() body: CreateCommentRequestDto) {
    return this.comments.create({
      topicId,
      authorId: body.authorId,
      body: body.body,
      parentId: body.parentId,
    });
  }
}
