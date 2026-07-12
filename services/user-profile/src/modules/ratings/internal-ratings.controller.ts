import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional } from 'class-validator';
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
}

@Controller('internal/v1/ratings')
export class InternalRatingsController {
  constructor(private readonly ratings: RatingsService) {}

  @Get(':userId')
  getStats(@Param('userId') userId: string) {
    return this.ratings.getStats(userId);
  }

  @Post(':userId/adjust')
  adjust(@Param('userId') userId: string, @Body() body: AdjustRatingBody) {
    return this.ratings.adjust(userId, body);
  }
}
