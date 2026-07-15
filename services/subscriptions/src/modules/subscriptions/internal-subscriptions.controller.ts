import {
  Body,
  Controller,
  Delete,
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
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  DIGEST_FREQUENCIES,
  SOURCE_DOMAINS,
  TARGET_TYPES,
} from '../../common/subscription.types';
import { InternalServiceTokenGuard } from '../auth/internal-service-token.guard';
import { SubscriptionsService } from './subscriptions.service';

class ListQueryDto {
  @IsString()
  @MinLength(1)
  userId!: string;

  @IsOptional()
  @IsIn([...SOURCE_DOMAINS])
  sourceDomain?: (typeof SOURCE_DOMAINS)[number];
}

class CreateSubscriptionDto {
  @IsString()
  @MinLength(1)
  userId!: string;

  @IsIn([...SOURCE_DOMAINS])
  sourceDomain!: (typeof SOURCE_DOMAINS)[number];

  @IsIn([...TARGET_TYPES])
  targetType!: (typeof TARGET_TYPES)[number];

  @ValidateIf((o: CreateSubscriptionDto) => o.targetType !== 'DIGEST_GLOBAL')
  @IsUUID()
  targetId?: string | null;

  @IsOptional()
  @IsObject()
  options?: Record<string, unknown>;
}

class DeleteQueryDto {
  @IsString()
  @MinLength(1)
  userId!: string;
}

class CountQueryDto {
  @IsString()
  @MinLength(1)
  userId!: string;

  @IsIn([...TARGET_TYPES])
  targetType!: (typeof TARGET_TYPES)[number];
}

class DeliveryQueryDto {
  @IsString()
  @MinLength(1)
  userId!: string;
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
  @IsString()
  @MinLength(1)
  userId!: string;

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

class MatchDto {
  @IsString()
  @MinLength(1)
  eventType!: string;

  @IsObject()
  payload!: Record<string, unknown>;
}

@Controller('internal/v1/subscriptions')
@UseGuards(InternalServiceTokenGuard)
export class InternalSubscriptionsController {
  constructor(private readonly subscriptions: SubscriptionsService) {}

  @Get()
  async list(@Query() query: ListQueryDto) {
    const data = await this.subscriptions.list(query.userId, query.sourceDomain);
    return { data };
  }

  @Get('count')
  async count(@Query() query: CountQueryDto) {
    const count = await this.subscriptions.countByTargetType(query.userId, query.targetType);
    return {
      count,
      limitKey: this.subscriptions.limitKeyFor(query.targetType),
    };
  }

  @Get('delivery')
  getDelivery(@Query() query: DeliveryQueryDto) {
    return this.subscriptions.getDeliveryPreference(query.userId);
  }

  @Patch('delivery')
  updateDelivery(@Body() body: UpdateDeliveryDto) {
    return this.subscriptions.upsertDeliveryPreference({
      userId: body.userId,
      emailDigestEnabled: body.emailDigestEnabled,
      pushEnabled: body.pushEnabled,
      digestFrequency: body.digestFrequency,
      quietHours: body.quietHours,
    });
  }

  @Post('match')
  match(@Body() body: MatchDto) {
    return this.subscriptions.match(body.eventType, body.payload);
  }

  @Post('digest/run')
  runDigest() {
    return this.subscriptions.runDigest();
  }

  @Post()
  create(@Body() body: CreateSubscriptionDto) {
    return this.subscriptions.create({
      userId: body.userId,
      sourceDomain: body.sourceDomain,
      targetType: body.targetType,
      targetId: body.targetId,
      options: body.options,
    });
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string, @Query() query: DeleteQueryDto) {
    return this.subscriptions.remove(query.userId, id);
  }
}
