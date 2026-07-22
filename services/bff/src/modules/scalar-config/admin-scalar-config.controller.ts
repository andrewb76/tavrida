import { Body, Controller, Delete, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { IsArray, IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { AdminGuard } from '../auth/admin.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ClubSettingsReader } from './club-settings.reader';
import type { ChatSettings, ClubSettings, ForumSettings } from './scalar-config.client';
import { ScalarConfigClient } from './scalar-config.client';
import { ForumSettingsReader } from './forum-settings.reader';

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

class PatchForumSettingsBodyDto {
  @IsOptional()
  @IsInt()
  @Min(-1)
  'edit.windowMinutes'?: number;

  @IsOptional()
  @IsInt()
  @Min(-1)
  'vote.changeWindowMinutes'?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  'vote.karmaPlusWeight'?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  'vote.karmaMinusWeight'?: number;
}

class PatchChatSettingsBodyDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  'spawn.copyHistoryMax'?: number;

  @IsOptional()
  @IsInt()
  @Min(-1)
  'message.editWindowMinutes'?: number;

  @IsOptional()
  @IsInt()
  @Min(-1)
  'message.deleteOwnWindowMinutes'?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  'message.lengthHardMax'?: number;

  @IsOptional()
  @IsBoolean()
  'topic.authorJoinOnPublish'?: boolean;

  @IsOptional()
  @IsBoolean()
  'topic.joinOnComment'?: boolean;

  @IsOptional()
  @IsBoolean()
  'dm.selfAutoCreate'?: boolean;

  @IsOptional()
  @IsBoolean()
  'unread.markReadOnOpen'?: boolean;

  @IsOptional()
  @IsIn(['ALL', 'DIRECT', 'GROUP', 'TOPIC'])
  'list.defaultFilter'?: string;

  @IsOptional()
  @IsBoolean()
  'group.leaveKeepsHistory'?: boolean;
}

@Controller('admin/scalar-config')
export class AdminScalarConfigController {
  constructor(
    private readonly scalarConfig: ScalarConfigClient,
    private readonly clubSettings: ClubSettingsReader,
    private readonly forumSettings: ForumSettingsReader,
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
    this.forumSettings.clearCache();
    return this.scalarConfig.deleteKey(key);
  }

  @Get('forum')
  @UseGuards(JwtAuthGuard, AdminGuard)
  getForum() {
    return this.scalarConfig.getForumSettings();
  }

  @Patch('forum')
  @UseGuards(JwtAuthGuard, AdminGuard)
  patchForum(@CurrentUser() user: AuthUser, @Body() body: PatchForumSettingsBodyDto) {
    this.forumSettings.clearCache();
    return this.scalarConfig.patchForumSettings(body as ForumSettings, user.sub);
  }

  @Get('chat')
  @UseGuards(JwtAuthGuard, AdminGuard)
  getChat() {
    return this.scalarConfig.getChatSettings();
  }

  @Patch('chat')
  @UseGuards(JwtAuthGuard, AdminGuard)
  patchChat(@CurrentUser() user: AuthUser, @Body() body: PatchChatSettingsBodyDto) {
    return this.scalarConfig.patchChatSettings(body as ChatSettings, user.sub);
  }
}
