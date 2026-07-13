import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
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
}

@Controller('internal/v1/topics')
export class InternalTopicsController {
  constructor(private readonly topics: TopicsService) {}

  @Get()
  list(@Query() query: ListTopicsQuery) {
    return this.topics.list(query);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.topics.getById(id);
  }

  @Post()
  create(@Body() body: CreateTopicRequestDto) {
    return this.topics.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdateTopicRequestDto) {
    return this.topics.update({ topicId: id, ...body });
  }
}
