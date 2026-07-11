import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { IsNumber, IsOptional, Min } from 'class-validator';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BillingClient } from '../billing/billing.client';

class DepositDto {
  @IsNumber()
  @Min(100)
  amount!: number;

  @IsOptional()
  description?: string;
}

@Controller('wallets')
@UseGuards(JwtAuthGuard)
export class WalletsController {
  constructor(private readonly billing: BillingClient) {}

  @Get('balance')
  balance(@CurrentUser() user: AuthUser) {
    return this.billing.getBalance(user.sub);
  }

  @Get('transactions')
  transactions(@CurrentUser() user: AuthUser, @Query('limit') limit?: string) {
    return this.billing.listTransactions(user.sub, limit ? Number(limit) : 20);
  }

  @Post('deposit')
  deposit(@CurrentUser() user: AuthUser, @Body() body: DepositDto) {
    return this.billing.deposit({
      userId: user.sub,
      amount: body.amount,
      description: body.description ?? 'Пополнение баланса',
    });
  }
}
