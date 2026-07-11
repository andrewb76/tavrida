import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { AdminGuard } from '../auth/admin.guard';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminUsersService } from './admin-users.service';

class ListUsersQuery {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  offset?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsString()
  q?: string;
}

class PatchRolesDto {
  @IsOptional()
  @IsBoolean()
  admin?: boolean;

  @IsOptional()
  @IsBoolean()
  moderator?: boolean;

  @IsOptional()
  @IsBoolean()
  expert?: boolean;
}

class AdminDepositDto {
  @Type(() => Number)
  @IsNumber()
  @Min(100)
  amount!: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;
}

@Controller('admin/users')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminUsersController {
  constructor(private readonly adminUsers: AdminUsersService) {}

  @Get()
  list(@Query() query: ListUsersQuery) {
    return this.adminUsers.listUsers(query);
  }

  @Patch(':userId/roles')
  patchRoles(
    @CurrentUser() actor: AuthUser,
    @Param('userId') userId: string,
    @Body() body: PatchRolesDto,
  ) {
    return this.adminUsers.patchRoles(actor.sub, userId, body);
  }

  @Post(':userId/wallet/deposit')
  deposit(
    @CurrentUser() actor: AuthUser,
    @Param('userId') userId: string,
    @Body() body: AdminDepositDto,
  ) {
    return this.adminUsers.adminDeposit(actor.sub, userId, body.amount, body.description);
  }
}
