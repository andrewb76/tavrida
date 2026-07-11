import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { TopicsService } from './topics.service';

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
}
