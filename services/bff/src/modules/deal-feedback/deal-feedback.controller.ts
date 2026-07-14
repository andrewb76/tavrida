import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DealFeedbackClient } from './deal-feedback.client';

class SubmitBody {
  @IsIn(['auction', 'marketplace'])
  dealType!: 'auction' | 'marketplace';

  @ValidateIf((o: SubmitBody) => o.dealType === 'auction')
  @IsUUID()
  auctionId?: string;

  @ValidateIf((o: SubmitBody) => o.dealType === 'marketplace')
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

@Controller('deal-feedback')
export class DealFeedbackController {
  constructor(private readonly client: DealFeedbackClient) {}

  @Get('pending')
  @UseGuards(JwtAuthGuard)
  pending(@CurrentUser() user: AuthUser) {
    return this.client.listPending(user.sub);
  }

  @Get('status')
  @UseGuards(JwtAuthGuard)
  status(
    @CurrentUser() user: AuthUser,
    @Query('dealType') dealType: 'auction' | 'marketplace',
    @Query('auctionId') auctionId?: string,
    @Query('orderId') orderId?: string,
  ) {
    return this.client.getStatus({
      userId: user.sub,
      dealType,
      auctionId,
      orderId,
    });
  }

  @Post('submit')
  @UseGuards(JwtAuthGuard)
  submit(@CurrentUser() user: AuthUser, @Body() body: SubmitBody) {
    return this.client.submit({
      userId: user.sub,
      ...body,
    });
  }
}
