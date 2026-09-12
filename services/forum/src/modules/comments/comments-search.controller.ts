import { Controller, Get, Query } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { CommentsService } from './comments.service';

class ListCommentsByAuthorQuery {
  @IsString()
  @Min(1)
  authorId!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}

@Controller('internal/v1/comments')
export class CommentsSearchController {
  constructor(private readonly comments: CommentsService) {}

  @Get()
  listByAuthor(@Query() query: ListCommentsByAuthorQuery) {
    return this.comments.listByAuthor(query.authorId, {
      limit: query.limit,
      offset: query.offset,
    });
  }
}
