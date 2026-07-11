import { Body, Controller, Delete, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { IsArray, IsBoolean, IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { AdminGuard } from '../auth/admin.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ClubSettingsReader } from './club-settings.reader';
import type { ClubSettings } from './scalar-config.client';
import { ScalarConfigClient } from './scalar-config.client';

class PatchClubSettingsBodyDto {
  @IsOptional()
  @IsBoolean()
  'registration.inviteOnly'?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  'invite.validityDays'?: number;

  @IsOptional()
  @IsIn(['SINGLE_USE', 'MULTI_USE'])
  'invite.codeType'?: 'SINGLE_USE' | 'MULTI_USE';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  'landing.publicSections'?: string[];
}

@Controller('admin/scalar-config')
export class AdminScalarConfigController {
  constructor(
    private readonly scalarConfig: ScalarConfigClient,
    private readonly clubSettings: ClubSettingsReader,
  ) {}

  @Get('club')
  @UseGuards(JwtAuthGuard, AdminGuard)
  getClub() {
    return this.scalarConfig.getClubSettings();
  }

  @Patch('club')
  @UseGuards(JwtAuthGuard, AdminGuard)
  patchClub(@CurrentUser() user: AuthUser, @Body() body: PatchClubSettingsBodyDto) {
    this.clubSettings.clearCache();
    return this.scalarConfig.patchClubSettings(body as ClubSettings, user.sub);
  }

  @Get('registry')
  @UseGuards(JwtAuthGuard, AdminGuard)
  listRegistry() {
    return this.scalarConfig.listRegistry();
  }

  @Delete('keys/:key')
  @UseGuards(JwtAuthGuard, AdminGuard)
  deleteKey(@Param('key') key: string) {
    this.clubSettings.clearCache();
    return this.scalarConfig.deleteKey(key);
  }
}
