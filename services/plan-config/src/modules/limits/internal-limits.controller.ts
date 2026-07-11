import { Body, Controller, Post } from '@nestjs/common';
import { IsInt, IsString, MaxLength, Min, MinLength } from 'class-validator';
import { LimitsService } from './limits.service';

class CheckLimitDto {
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  userId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(128)
  variableKey!: string;

  @IsInt()
  @Min(0)
  requestedValue!: number;

  @IsInt()
  @Min(0)
  currentUsage!: number;
}

class CanUseFeatureDto {
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  userId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(128)
  featureKey!: string;
}

@Controller('internal/v1')
export class InternalLimitsController {
  constructor(private readonly limits: LimitsService) {}

  @Post('limits/check')
  check(@Body() body: CheckLimitDto) {
    return this.limits.checkLimit({
      userId: body.userId,
      variableKey: body.variableKey,
      requestedValue: body.requestedValue,
      currentUsage: body.currentUsage,
    });
  }

  @Post('features/can-use')
  canUse(@Body() body: CanUseFeatureDto) {
    return this.limits.canUseFeature(body);
  }
}
