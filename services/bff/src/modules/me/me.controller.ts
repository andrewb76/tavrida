import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MeService } from './me.service';

class SyncIdentityDto {
  @IsOptional()
  @IsString()
  @MaxLength(256)
  name?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  username?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(320)
  email?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  avatarUrl?: string | null;
}

@Controller('me')
export class MeController {
  constructor(private readonly me: MeService) {}

  @Get('roles')
  @UseGuards(JwtAuthGuard)
  getRoles(@CurrentUser() user: AuthUser) {
    return this.me.getRoles(user.sub);
  }

  @Post('identity')
  @UseGuards(JwtAuthGuard)
  syncIdentity(@CurrentUser() user: AuthUser, @Body() body: SyncIdentityDto) {
    return this.me.syncIdentity(user.sub, body);
  }
}
