import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PlanConfigClient } from '../plan-config/plan-config.client';

@Controller('charges')
export class ChargesController {
  constructor(private readonly planConfig: PlanConfigClient) {}

  /** Quote one-time charge for current member's plan before billing.charge. */
  @Get('quote')
  @UseGuards(JwtAuthGuard)
  quote(@CurrentUser() user: AuthUser, @Query('key') key?: string) {
    if (!key?.trim()) {
      throw new BadRequestException({
        type: 'validation-error',
        detail: 'key query parameter is required',
      });
    }
    return this.planConfig.resolvePrice(user.sub, key.trim());
  }
}
