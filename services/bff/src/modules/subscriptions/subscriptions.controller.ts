import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { IsIn, IsObject, IsOptional, IsUUID, ValidateIf } from 'class-validator';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PlanConfigClient } from '../plan-config/plan-config.client';
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

@Controller('subscriptions')
@UseGuards(JwtAuthGuard)
export class SubscriptionsController {
  constructor(
    private readonly subscriptions: SubscriptionsClient,
    private readonly planConfig: PlanConfigClient,
  ) {}

  @Get()
  async list(
    @CurrentUser() user: AuthUser,
    @Query('sourceDomain') sourceDomain?: string,
  ) {
    if (sourceDomain && !SOURCE_DOMAINS.includes(sourceDomain as (typeof SOURCE_DOMAINS)[number])) {
      throw new BadRequestException('Invalid sourceDomain');
    }
    return this.subscriptions.list(user.sub, sourceDomain);
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
