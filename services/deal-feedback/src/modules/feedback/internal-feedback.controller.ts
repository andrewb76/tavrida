import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { FeedbackService } from './feedback.service';

class CreatePendingDto {
  @IsIn(['auction', 'marketplace'])
  dealType!: 'auction' | 'marketplace';

  @ValidateIf((o: CreatePendingDto) => o.dealType === 'auction')
  @IsUUID()
  auctionId?: string;

  @ValidateIf((o: CreatePendingDto) => o.dealType === 'marketplace')
  @IsUUID()
  orderId?: string;

  @IsString()
  @MinLength(1)
  sellerId!: string;

  @IsString()
  @MinLength(1)
  buyerId!: string;
}

class SubmitDto {
  @IsString()
  @MinLength(1)
  userId!: string;

  @IsIn(['auction', 'marketplace'])
  dealType!: 'auction' | 'marketplace';

  @ValidateIf((o: SubmitDto) => o.dealType === 'auction')
  @IsUUID()
  auctionId?: string;

  @ValidateIf((o: SubmitDto) => o.dealType === 'marketplace')
  @IsUUID()
  orderId?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsOptional()
  @IsString()
  comment?: string;
}

@Controller('internal/v1/deal-feedback')
export class InternalFeedbackController {
  constructor(private readonly feedback: FeedbackService) {}

  @Post('pending/create')
  createPending(@Body() body: CreatePendingDto) {
    return this.feedback.createPendingPair(body);
  }

  @Get('pending')
  listPending(@Query('userId') userId: string) {
    return this.feedback.listPending(userId);
  }

  @Get('status')
  status(
    @Query('userId') userId: string,
    @Query('dealType') dealType: 'auction' | 'marketplace',
    @Query('auctionId') auctionId?: string,
    @Query('orderId') orderId?: string,
  ) {
    return this.feedback.getStatus({ userId, dealType, auctionId, orderId });
  }

  @Post('submit')
  submit(@Body() body: SubmitDto) {
    return this.feedback.submit(body);
  }

  @Post('reminders/run')
  remindersRun() {
    return { triggered: 0 };
  }
}
