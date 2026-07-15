import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  IsBoolean,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PlanConfigClient } from '../plan-config/plan-config.client';
import { SubscriptionTitlesService } from './subscription-titles.service';
import { SubscriptionsClient } from './subscriptions.client';

const SOURCE_DOMAINS = ['auction', 'forum', 'marketplace', 'platform'] as const;
const TARGET_TYPES = [
  'AUCTION_CATEGORY',
  'AUCTION',
  'FORUM_CATEGORY',
  'FORUM_TOPIC',
  'TAG',
  'MARKETPLACE_CATEGORY',
  'DIGEST_GLOBAL',
] as const;
const DIGEST_FREQUENCIES = ['DAILY', 'WEEKLY'] as const;
const EMAIL_DIGEST_FEATURE_KEY = 'subscriptions.member.notify.emailDigestEnabled';

class CreateSubscriptionDto {
  @IsIn([...SOURCE_DOMAINS])
  sourceDomain!: (typeof SOURCE_DOMAINS)[number];

  @IsIn([...TARGET_TYPES])
  targetType!: (typeof TARGET_TYPES)[number];

  @ValidateIf((o: CreateSubscriptionDto) => o.targetType !== 'DIGEST_GLOBAL')
  @IsUUID()
  targetId?: string;

  @IsOptional()
  @IsObject()
  options?: Record<string, unknown>;
}

class QuietHoursDto {
  @IsString()
  start!: string;

  @IsString()
  end!: string;

  @IsString()
  tz!: string;
}

class UpdateDeliveryDto {
  @IsOptional()
  @IsBoolean()
  emailDigestEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  pushEnabled?: boolean;

  @IsOptional()
  @IsIn([...DIGEST_FREQUENCIES])
  digestFrequency?: (typeof DIGEST_FREQUENCIES)[number];

  @IsOptional()
  @ValidateNested()
  @Type(() => QuietHoursDto)
  quietHours?: QuietHoursDto | null;
}

@Controller('subscriptions')
@UseGuards(JwtAuthGuard)
export class SubscriptionsController {
  constructor(
    private readonly subscriptions: SubscriptionsClient,
    private readonly planConfig: PlanConfigClient,
    private readonly titles: SubscriptionTitlesService,
  ) {}

  @Get()
  async list(
    @CurrentUser() user: AuthUser,
    @Query('sourceDomain') sourceDomain?: string,
  ) {
    if (sourceDomain && !SOURCE_DOMAINS.includes(sourceDomain as (typeof SOURCE_DOMAINS)[number])) {
      throw new BadRequestException('Invalid sourceDomain');
    }
    const result = await this.subscriptions.list(user.sub, sourceDomain);
    const data = await this.titles.enrichList(result.data ?? []);
    return { data };
  }

  @Post()
  async create(@CurrentUser() user: AuthUser, @Body() body: CreateSubscriptionDto) {
    await this.assertWithinLimit(user.sub, body.targetType);
    return this.subscriptions.create({
      userId: user.sub,
      sourceDomain: body.sourceDomain,
      targetType: body.targetType,
      targetId: body.targetId ?? null,
      options: body.options,
    });
  }

  @Delete(':id')
  async remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.subscriptions.remove(user.sub, id);
  }

  @Get('delivery')
  getDelivery(@CurrentUser() user: AuthUser) {
    return this.subscriptions.getDelivery(user.sub);
  }

  @Patch('delivery')
  async updateDelivery(@CurrentUser() user: AuthUser, @Body() body: UpdateDeliveryDto) {
    if (body.emailDigestEnabled === true) {
      const feature = await this.planConfig.canUseFeature({
        userId: user.sub,
        featureKey: EMAIL_DIGEST_FEATURE_KEY,
      });
      if (!feature.allowed) {
        throw new ForbiddenException({
          message: 'Email digest is not available on your plan',
          variableKey: EMAIL_DIGEST_FEATURE_KEY,
          planId: feature.planId,
        });
      }
    }

    return this.subscriptions.updateDelivery({
      userId: user.sub,
      emailDigestEnabled: body.emailDigestEnabled,
      pushEnabled: body.pushEnabled,
      digestFrequency: body.digestFrequency,
      quietHours: body.quietHours,
    });
  }

  private async assertWithinLimit(userId: string, targetType: string) {
    const { count, limitKey } = await this.subscriptions.count(userId, targetType);
    if (!limitKey) return;

    const check = await this.planConfig.checkLimit({
      userId,
      variableKey: limitKey,
      requestedValue: 1,
      currentUsage: count,
    });

    if (!check.allowed) {
      throw new ForbiddenException({
        message: 'Subscription limit reached for this target type',
        variableKey: limitKey,
        limit: check.limit,
        currentUsage: count,
      });
    }
  }
}
