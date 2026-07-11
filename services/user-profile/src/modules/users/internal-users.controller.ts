import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { IsOptional, IsString, MinLength } from 'class-validator';
import { UsersService } from './users.service';

class ListUsersQuery {
  @IsOptional()
  offset?: number;

  @IsOptional()
  limit?: number;

  @IsOptional()
  @IsString()
  q?: string;
}

class EnsureUserBody {
  @IsString()
  @MinLength(1)
  userId!: string;
}

@Controller('internal/v1/users')
export class InternalUsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list(@Query() query: ListUsersQuery) {
    return this.users.list(query);
  }

  @Post('ensure')
  ensure(@Body() body: EnsureUserBody) {
    return this.users.ensure(body.userId);
  }

  @Get(':userId')
  getById(@Param('userId') userId: string) {
    return this.users.getById(userId);
  }
}
