import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { TopicsService } from './topics.service';

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

  @IsOptional()
  @IsIn(['DRAFT', 'PUBLISHED'])
  status?: 'DRAFT' | 'PUBLISHED';

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MediaAttachmentDto)
  attachments?: MediaAttachmentDto[];
}

class ListTopicsQuery {
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  limit?: number;

  @IsOptional()
  @IsIn(['DRAFT', 'PUBLISHED'])
  status?: 'DRAFT' | 'PUBLISHED';

  @IsOptional()
  @IsString()
  @MinLength(1)
  authorId?: string;
}

class CreateTopicRequestDto extends CreateTopicDto {
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

class UpdateTopicDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(256)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  body?: string;

  @IsOptional()
  @IsIn(['DRAFT', 'PUBLISHED'])
  status?: 'DRAFT' | 'PUBLISHED';

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MediaAttachmentDto)
  attachments?: MediaAttachmentDto[];
}

class UpdateTopicRequestDto extends UpdateTopicDto {
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

@Controller('internal/v1/topics')
export class InternalTopicsController {
  constructor(private readonly topics: TopicsService) {}

  @Get()
  list(@Query() query: ListTopicsQuery) {
    return this.topics.list(query);
  }

  @Get(':id')
  getById(
    @Param('id') id: string,
    @Query('viewerId') viewerId?: string,
    @Query('changeWindowMinutes') changeWindowMinutes?: string,
  ) {
    return this.topics.getById(id, {
      userId: viewerId,
      changeWindowMinutes:
        changeWindowMinutes != null && changeWindowMinutes !== ''
          ? Number(changeWindowMinutes)
          : undefined,
    });
  }

  @Post()
  create(@Body() body: CreateTopicRequestDto) {
    return this.topics.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdateTopicRequestDto) {
    return this.topics.update({ topicId: id, ...body });
  }

  @Delete(':id')
  softDelete(
    @Param('id') id: string,
    @Body() body: { actorId: string; asModerator?: boolean },
  ) {
    return this.topics.softDelete({
      topicId: id,
      actorId: body.actorId,
      asModerator: body.asModerator,
    });
  }

  @Put(':id/tags')
  updateTags(
    @Param('id') id: string,
    @Body() body: { authorId: string; tags: string[]; asModerator?: boolean },
  ) {
    return this.topics.updateTags({
      topicId: id,
      authorId: body.authorId,
      tags: body.tags,
      asModerator: body.asModerator,
    });
  }
}
