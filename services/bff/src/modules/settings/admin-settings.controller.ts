import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { IsArray, IsBoolean, IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { AdminGuard } from '../auth/admin.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ClubSettingsReader } from './club-settings.reader';
import type { ClubSettings } from './settings.client';
import { SettingsClient } from './settings.client';

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

@Controller('admin/settings')
export class AdminSettingsController {
  constructor(
    private readonly settings: SettingsClient,
    private readonly clubSettings: ClubSettingsReader,
  ) {}

  @Get('club')
  @UseGuards(JwtAuthGuard, AdminGuard)
  getClub() {
    return this.settings.getClubSettings();
  }

  @Patch('club')
  @UseGuards(JwtAuthGuard, AdminGuard)
  patchClub(@CurrentUser() user: AuthUser, @Body() body: PatchClubSettingsBodyDto) {
    this.clubSettings.clearCache();
    return this.settings.patchClubSettings(body as ClubSettings, user.sub);
  }
}
