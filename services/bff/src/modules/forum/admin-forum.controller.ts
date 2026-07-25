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

class SetCategoryAccessGroupsDto {
  @IsArray()
  @IsUUID('4', { each: true })
  groupIds!: string[];
}

class CreateAccessGroupDto {
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}

class UpdateAccessGroupDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}

class SetAccessGroupMembersDto {
  @IsArray()
  @IsString({ each: true })
  userIds!: string[];
}

@Controller('admin/forum')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminForumController {
  constructor(private readonly forum: ForumClient) {}

  @Get('access-groups')
  listAccessGroups() {
    return this.forum.listAccessGroups();
  }

  @Post('access-groups')
  createAccessGroup(@Body() body: CreateAccessGroupDto) {
    return this.forum.createAccessGroup(body);
  }

  @Patch('access-groups/:id')
  updateAccessGroup(@Param('id') id: string, @Body() body: UpdateAccessGroupDto) {
    return this.forum.updateAccessGroup(id, body);
  }

  @Delete('access-groups/:id')
  deleteAccessGroup(@Param('id') id: string) {
    return this.forum.deleteAccessGroup(id);
  }

  @Get('access-groups/:id/members')
  getAccessGroupMembers(@Param('id') id: string) {
    return this.forum.getAccessGroupMembers(id);
  }

  @Put('access-groups/:id/members')
  setAccessGroupMembers(@Param('id') id: string, @Body() body: SetAccessGroupMembersDto) {
    return this.forum.setAccessGroupMembers(id, body.userIds ?? []);
  }

  @Post('categories')
  createCategory(@Body() body: CreateForumCategoryDto) {
    return this.forum.createCategory(body);
  }

  @Patch('categories/:id')
  updateCategory(@Param('id') id: string, @Body() body: UpdateForumCategoryDto) {
    return this.forum.updateCategory(id, body);
  }

  @Get('categories/:id/access-groups')
  getCategoryAccessGroups(@Param('id') id: string) {
    return this.forum.getCategoryAccessGroups(id);
  }

  @Put('categories/:id/access-groups')
  setCategoryAccessGroups(@Param('id') id: string, @Body() body: SetCategoryAccessGroupsDto) {
    return this.forum.setCategoryAccessGroups(id, body.groupIds ?? []);
  }

  @Delete('categories/:id')
  deleteCategory(@Param('id') id: string) {
    return this.forum.deleteCategory(id);
  }
}
