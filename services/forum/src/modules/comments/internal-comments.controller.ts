import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
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

  @IsOptional()
  @IsBoolean()
  isAdmin?: boolean;
}

class UpdateCommentDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  body?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MediaAttachmentDto)
  attachments?: MediaAttachmentDto[];
}

class UpdateCommentRequestDto extends UpdateCommentDto {
  @IsString()
  @MinLength(1)
  authorId!: string;

  @Type(() => Number)
  @IsInt()
  editWindowMinutes!: number;

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

  @IsOptional()
  @IsBoolean()
  asModerator?: boolean;
}

@Controller('internal/v1/topics/:topicId/comments')
export class InternalCommentsController {
  constructor(private readonly comments: CommentsService) {}

  @Get()
  list(
    @Param('topicId') topicId: string,
    @Query('viewerId') viewerId?: string,
    @Query('changeWindowMinutes') changeWindowMinutes?: string,
    @Query('isAdmin') isAdmin?: string,
  ) {
    return this.comments.listByTopic(topicId, {
      userId: viewerId,
      changeWindowMinutes:
        changeWindowMinutes != null && changeWindowMinutes !== ''
          ? Number(changeWindowMinutes)
          : undefined,
      isAdmin: isAdmin === '1' || isAdmin === 'true',
    });
  }

  @Post()
  create(@Param('topicId') topicId: string, @Body() body: CreateCommentRequestDto) {
    return this.comments.create({
      topicId,
      ...body,
    });
  }

  @Patch(':commentId')
  update(
    @Param('topicId') topicId: string,
    @Param('commentId') commentId: string,
    @Body() body: UpdateCommentRequestDto,
  ) {
    return this.comments.update({
      topicId,
      commentId,
      ...body,
    });
  }

  @Delete(':commentId')
  softDelete(
    @Param('topicId') topicId: string,
    @Param('commentId') commentId: string,
    @Body() body: { actorId: string; asModerator?: boolean },
  ) {
    return this.comments.softDelete({
      topicId,
      commentId,
      actorId: body.actorId,
      asModerator: body.asModerator,
    });
  }

  @Post(':commentId/promote-to-topic')
  promote(
    @Param('topicId') topicId: string,
    @Param('commentId') commentId: string,
    @Body() body: { actorId: string; title?: string; asModerator?: boolean },
  ) {
    return this.comments.promoteToTopic({
      topicId,
      commentId,
      actorId: body.actorId,
      title: body.title,
      asModerator: body.asModerator,
    });
  }
}
