import { Controller, Get, Param, Query } from '@nestjs/common';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { TagsService } from './tags.service';

class SearchTagsQuery {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}

@Controller('internal/v1/tags')
export class InternalTagsController {
  constructor(private readonly tags: TagsService) {}

  @Get()
  search(@Query() query: SearchTagsQuery) {
    return this.tags.search({ q: query.q, limit: query.limit });
  }

  @Get(':slug')
  getBySlug(@Param('slug') slug: string) {
    return this.tags.getBySlug(slug);
  }
}
