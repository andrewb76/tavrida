import { Body, Controller, Delete, Get, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { AdminGuard } from '../auth/admin.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ForumClient } from './forum.client';

class CreateForumCategoryDto {
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

class UpdateForumCategoryDto {
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

class SetCategoryMembersDto {
  @IsArray()
  @IsString({ each: true })
  userIds!: string[];
}

@Controller('admin/forum/categories')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminForumController {
  constructor(private readonly forum: ForumClient) {}

  @Post()
  createCategory(@Body() body: CreateForumCategoryDto) {
    return this.forum.createCategory(body);
  }

  @Patch(':id')
  updateCategory(@Param('id') id: string, @Body() body: UpdateForumCategoryDto) {
    return this.forum.updateCategory(id, body);
  }

  @Get(':id/members')
  getMembers(@Param('id') id: string) {
    return this.forum.getCategoryMembers(id);
  }

  @Put(':id/members')
  setMembers(@Param('id') id: string, @Body() body: SetCategoryMembersDto) {
    return this.forum.setCategoryMembers(id, body.userIds ?? []);
  }

  @Delete(':id')
  deleteCategory(@Param('id') id: string) {
    return this.forum.deleteCategory(id);
  }
}
