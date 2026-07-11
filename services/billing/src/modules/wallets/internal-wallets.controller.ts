import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Post,
  Query,
} from '@nestjs/common';
import { IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { WalletsService } from './wallets.service';

class ChargeDto {
  @IsString()
  @MinLength(1)
  userId!: string;

  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsString()
  @MinLength(1)
  target!: string;

  @IsString()
  @MinLength(1)
  description!: string;
}

class DepositDto {
  @IsString()
  @MinLength(1)
  userId!: string;

  @IsNumber()
  @Min(1)
  amount!: number;

  @IsOptional()
  @IsString()
  description?: string;
}

@Controller('internal/v1/wallets')
export class InternalWalletsController {
  constructor(private readonly wallets: WalletsService) {}

  @Get('balance')
  balance(@Query('userId') userId: string) {
    return this.wallets.getBalance(userId);
  }

  @Get('transactions')
  transactions(@Query('userId') userId: string, @Query('limit') limit?: string) {
    return this.wallets.listTransactions(userId, limit ? Number(limit) : 20);
  }

  @Post('charge')
  @HttpCode(200)
  charge(@Body() body: ChargeDto, @Headers('idempotency-key') idempotencyKey?: string) {
    return this.wallets.charge({ ...body, idempotencyKey });
  }

  @Post('deposit')
  @HttpCode(200)
  deposit(@Body() body: DepositDto) {
    return this.wallets.deposit(body);
  }
}
