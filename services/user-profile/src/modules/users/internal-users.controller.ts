import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
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

class SetHardLockBody {
  @IsBoolean()
  locked!: boolean;

  @IsString()
  @MinLength(1)
  actorId!: string;
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

  @Get('search')
  search(
    @Query('q') q?: string,
    @Query('limit') limit?: string,
  ) {
    return this.users.searchByUsername({
      q: q ?? '',
      limit: limit ? Number(limit) : 10,
    });
  }

  @Get('by-username/:username')
  getByUsername(@Param('username') username: string) {
    return this.users.getByUsername(username);
  }

  @Get(':userId/public')
  getPublic(@Param('userId') userId: string) {
    return this.users.getPublicProfile(userId);
  }

  @Get(':userId/hard-lock')
  getHardLock(@Param('userId') userId: string) {
    return this.users.isHardLocked(userId);
  }

  @Patch(':userId/hard-lock')
  setHardLock(@Param('userId') userId: string, @Body() body: SetHardLockBody) {
    return this.users.setHardLock({
      userId,
      locked: body.locked,
      actorId: body.actorId,
    });
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
