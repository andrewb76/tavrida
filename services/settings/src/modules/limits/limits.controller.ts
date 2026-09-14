import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import type { LimitPeriod } from './dto/limits.dto';
import {
  CheckLimitDto,
  ConsumeLimitDto,
  GrantLimitDto,
  PurchaseLimitDto,
} from './dto/limits.dto';
import { LimitsRestoreService } from './limits-restore.service';
import { LimitsService } from './limits.service';

@Controller('internal/v1/limits')
export class LimitsController {
  constructor(
    private readonly limits: LimitsService,
    private readonly restoreService: LimitsRestoreService,
  ) {}

  @Post('check')
  check(@Body() body: CheckLimitDto) {
    return this.limits.check(body);
  }

  @Post('consume')
  consume(@Body() body: ConsumeLimitDto) {
    return this.limits.consume(body);
  }

  @Post('grant')
  grant(@Body() body: GrantLimitDto) {
    return this.limits.grant(body);
  }

  @Post('purchase')
  purchase(@Body() body: PurchaseLimitDto) {
    return this.limits.purchase(body);
  }

  @Get('state')
  getState(
    @Query('userId') userId: string,
    @Query('key') key?: string,
  ) {
    return this.limits.getState(userId, key);
  }

  @Post('restore/run')
  restoreRun() {
    return this.restoreService.handleExpiredCycles();
  }

  @Get('usage-log')
  getUsageLog(
    @Query('userId') userId?: string,
    @Query('key') key?: string,
    @Query('period') period?: LimitPeriod,
    @Query('source') source?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.limits.getUsageLog({
      userId,
      key,
      period,
      source,
      dateFrom,
      dateTo,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }
}
