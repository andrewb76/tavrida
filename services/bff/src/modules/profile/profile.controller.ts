import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { AdminGuard } from '../auth/admin.guard';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserProfileClient } from '../user-profile/user-profile.client';

class UpsertProfileNoteDto {
  @IsString()
  @MinLength(1)
  ownerId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  text!: string;
}

class AdjustRatingDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  karmaDelta?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  ratingDelta?: number;
}

@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private readonly profiles: UserProfileClient) {}

  @Get('notes')
  getNote(@CurrentUser() user: AuthUser, @Query('ownerId') ownerId: string) {
    return this.profiles.getProfileNote(ownerId, user.sub);
  }

  @Post('notes')
  upsertNote(@CurrentUser() user: AuthUser, @Body() body: UpsertProfileNoteDto) {
    return this.profiles.upsertProfileNote({
      ownerId: body.ownerId,
      authorId: user.sub,
      text: body.text,
    });
  }

  @Delete('notes/:id')
  deleteNote(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.profiles.deleteProfileNote(id, user.sub);
  }

  @Post(':userId/rating/adjust')
  @UseGuards(AdminGuard)
  adjustRating(
    @CurrentUser() user: AuthUser,
    @Param('userId') userId: string,
    @Body() body: AdjustRatingDto,
  ) {
    return this.profiles.adjustRating(userId, {
      ...body,
      actorId: user.sub,
      source: 'ADMIN_ADJUST',
    });
  }

  @Get(':userId/rating/log')
  async getRatingLog(
    @Param('userId') userId: string,
    @Query('metric') metric: 'karma' | 'rating',
    @Query('limit') limit?: string,
  ) {
    const result = await this.profiles.getRatingLog(userId, {
      metric: metric === 'rating' ? 'rating' : 'karma',
      limit: limit ? Number(limit) : undefined,
    });

    const actorIds = [
      ...new Set(result.data.map((row) => row.actorId).filter((id): id is string => Boolean(id))),
    ];
    const actors = new Map<
      string,
      { userId: string; displayName: string | null; avatarUrl: string | null }
    >();
    if (actorIds.length > 0) {
      try {
        const rows = await this.profiles.lookupByIds(actorIds);
        for (const row of rows) {
          actors.set(row.userId, {
            userId: row.userId,
            displayName: row.displayName,
            avatarUrl: row.avatarUrl,
          });
        }
      } catch {
        /* keep raw ids */
      }
    }

    return {
      data: result.data.map((row) => ({
        ...row,
        actor: row.actorId
          ? (actors.get(row.actorId) ?? {
              userId: row.actorId,
              displayName: null,
              avatarUrl: null,
            })
          : null,
      })),
    };
  }

  @Get(':userId')
  async getPublicProfile(@Param('userId') userId: string) {
    const [profile, rating] = await Promise.all([
      this.profiles.getPublicProfile(userId),
      this.profiles.getRatingStats(userId),
    ]);
    return { ...profile, rating };
  }
}
