import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import type { MetadataSchema } from '../../common/metadata-schema';
import { CategoriesService } from '../categories/categories.service';
import { PeriodsService } from './periods.service';

class CreatePeriodDto {
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsUUID()
  parentId?: string;

  @IsString()
  @MinLength(1)
  startsOn!: string;

  @IsString()
  @MinLength(1)
  endsOn!: string;

  @IsString()
  @MinLength(1)
  title!: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortIndex?: number;
}

class UpdatePeriodDto {
  @IsOptional()
  @IsString()
  startsOn?: string;

  @IsOptional()
  @IsString()
  endsOn?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortIndex?: number;

  @IsOptional()
  @IsUUID()
  categoryId?: string;
}

class ChildPeriodDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsString()
  startsOn!: string;

  @IsString()
  endsOn!: string;

  @IsString()
  @MinLength(1)
  title!: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

class ReplaceChildrenDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChildPeriodDto)
  children!: ChildPeriodDto[];
}

class CreateCategoryDto {
  @IsString()
  @MinLength(1)
  slug!: string;

  @IsString()
  @MinLength(1)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsObject()
  metadataSchema?: MetadataSchema;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsObject()
  metadataSchema?: MetadataSchema;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

@Controller('internal/v1/periods')
export class InternalPeriodsController {
  constructor(
    private readonly periods: PeriodsService,
    private readonly categories: CategoriesService,
  ) {}

  @Get('categories')
  async listCategories(@Query('activeOnly') activeOnly?: string) {
    const data = await this.categories.list(activeOnly === 'true');
    return { data };
  }

  @Get('categories/:id')
  getCategory(@Param('id', ParseUUIDPipe) id: string) {
    return this.categories.get(id);
  }

  @Post('categories')
  createCategory(@Body() body: CreateCategoryDto) {
    return this.categories.create(body);
  }

  @Patch('categories/:id')
  updateCategory(@Param('id', ParseUUIDPipe) id: string, @Body() body: UpdateCategoryDto) {
    return this.categories.update(id, body);
  }

  @Delete('categories/:id')
  removeCategory(@Param('id', ParseUUIDPipe) id: string) {
    return this.categories.remove(id);
  }

  @Get()
  async list(
    @Query('categoryId') categoryId?: string,
    @Query('categorySlug') categorySlug?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('parentId') parentId?: string,
    @Query('rootId') rootId?: string,
    @Query('rootsOnly') rootsOnly?: string,
    @Query('maxDepth') maxDepth?: string,
    @Query('metadata') metadataRaw?: string,
    @Query('view') view?: 'flat' | 'tree',
  ) {
    let metadata: Record<string, unknown> | undefined;
    if (metadataRaw) {
      try {
        metadata = JSON.parse(metadataRaw) as Record<string, unknown>;
      } catch {
        metadata = undefined;
      }
    }

    const data = await this.periods.query({
      categoryId,
      categorySlug,
      from,
      to,
      parentId: parentId === 'null' ? null : parentId,
      rootId,
      rootsOnly: rootsOnly === 'true',
      maxDepth: maxDepth !== undefined ? Number(maxDepth) : undefined,
      metadata,
      view: view ?? 'tree',
    });
    return { data };
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.periods.get(id);
  }

  @Post()
  create(@Body() body: CreatePeriodDto) {
    return this.periods.create(body);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() body: UpdatePeriodDto) {
    return this.periods.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.periods.remove(id);
  }

  @Put(':id/children')
  replaceChildren(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ReplaceChildrenDto,
  ) {
    return this.periods.replaceChildren(id, body.children);
  }
}
