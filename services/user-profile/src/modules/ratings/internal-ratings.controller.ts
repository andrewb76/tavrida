import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNumber, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';
import type { ReputationChangeSource, ReputationMetric } from '../../entities/reputation-change-log.entity';
import { RatingsService } from './ratings.service';

class AdjustRatingBody {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  karmaDelta?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  ratingDelta?: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
  actorId?: string;

  @IsOptional()
  @IsIn(['ADMIN_ADJUST', 'FORUM_VOTE', 'DEAL_FEEDBACK', 'REFERRAL', 'BONUS', 'PENALTY', 'SYSTEM'])
  source?: ReputationChangeSource;

  @IsOptional()
  @IsString()
  note?: string;
}

class ListLogQuery {
  @IsIn(['karma', 'rating'])
  metric!: ReputationMetric;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

@Controller('internal/v1/ratings')
export class InternalRatingsController {
  constructor(private readonly ratings: RatingsService) {}

  @Get(':userId/log')
  listLog(@Param('userId') userId: string, @Query() query: ListLogQuery) {
    return this.ratings.listLog(userId, query);
  }

  @Get(':userId')
  getStats(@Param('userId') userId: string) {
    return this.ratings.getStats(userId);
  }

  @Post(':userId/adjust')
  adjust(@Param('userId') userId: string, @Body() body: AdjustRatingBody) {
    return this.ratings.adjust(userId, body);
  }
}
