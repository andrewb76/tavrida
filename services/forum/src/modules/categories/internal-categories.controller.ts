import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { CategoriesService } from './categories.service';

class CreateCategoryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  slug!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(128)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @ValidateIf((_, value) => value != null)
  @IsUUID()
  parentId?: string | null;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  slug?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @ValidateIf((_, value) => value != null)
  @IsUUID()
  parentId?: string | null;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

@Controller('internal/v1/categories')
export class InternalCategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  listTree() {
    return this.categories.listTree();
  }

  @Post()
  create(@Body() body: CreateCategoryDto) {
    return this.categories.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdateCategoryDto) {
    return this.categories.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.categories.remove(id);
  }
}
