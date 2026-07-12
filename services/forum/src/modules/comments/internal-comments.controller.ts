import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { CommentsService } from './comments.service';

class MediaAttachmentDto {
  @IsString()
  @MinLength(1)
  url!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(256)
  filename!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(128)
  contentType!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  sizeBytes!: number;
}

class CreateCommentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  body!: string;

  @IsOptional()
  @IsUUID()
  parentId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MediaAttachmentDto)
  attachments?: MediaAttachmentDto[];
}

class CreateCommentRequestDto extends CreateCommentDto {
  @IsString()
  @MinLength(1)
  authorId!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxAttachmentCount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxAttachmentSizeBytes?: number;
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
      ...body,
    });
  }
}
