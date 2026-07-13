import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { SOURCE_DOMAINS, TARGET_TYPES } from '../../common/subscription.types';
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

@Controller('internal/v1/subscriptions')
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
