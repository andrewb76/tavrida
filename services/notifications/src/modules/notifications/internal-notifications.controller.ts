import { Body, Controller, Post } from '@nestjs/common';
import { IsObject, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { NotificationsService } from './notifications.service';

class TriggerDto {
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  userId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(128)
  workflowId!: string;

  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}

class UpsertSubscriberDto {
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  userId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(320)
  email?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  fcmToken?: string | null;
}

@Controller('internal/v1/notifications')
export class InternalNotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Post('trigger')
  trigger(@Body() body: TriggerDto) {
    return this.notifications.trigger(body);
  }

  @Post('subscribers/upsert')
  upsert(@Body() body: UpsertSubscriberDto) {
    return this.notifications.upsertSubscriber(body);
  }
}
