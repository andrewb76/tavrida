import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { UsersService } from './users.service';

class ListUsersQuery {
  @IsOptional()
  offset?: number;

  @IsOptional()
  limit?: number;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsBoolean()
  includeDeleted?: boolean;
}

class EnsureUserBody {
  @IsString()
  @MinLength(1)
  userId!: string;
}

class LookupUsersBody {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsString({ each: true })
  ids!: string[];
}

class SyncLogtoBody {
  @IsString()
  @MinLength(1)
  userId!: string;

  @IsOptional()
  @IsString()
  name?: string | null;

  @IsOptional()
  @IsString()
  username?: string | null;

  @IsOptional()
  @IsString()
  primaryEmail?: string | null;

  @IsOptional()
  @IsString()
  primaryPhone?: string | null;

  @IsOptional()
  @IsString()
  avatar?: string | null;

  @IsOptional()
  @IsBoolean()
  isSuspended?: boolean;
}

@Controller('internal/v1/users')
export class InternalUsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list(@Query() query: ListUsersQuery) {
    return this.users.list(query);
  }

  @Post('sync-logto')
  syncLogto(@Body() body: SyncLogtoBody) {
    return this.users.syncFromLogto(body);
  }

  @Post('ensure')
  ensure(@Body() body: EnsureUserBody) {
    return this.users.ensure(body.userId);
  }

  @Post('lookup')
  lookup(@Body() body: LookupUsersBody) {
    return this.users.lookupByIds(body.ids);
  }

  @Get(':userId/public')
  getPublic(@Param('userId') userId: string) {
    return this.users.getPublicProfile(userId);
  }

  @Get(':userId')
  getById(@Param('userId') userId: string) {
    return this.users.getById(userId);
  }

  @Post(':userId/mark-deleted')
  markDeleted(@Param('userId') userId: string) {
    return this.users.markDeleted(userId);
  }
}
