import { Controller, Get } from '@nestjs/common';
import { PlansService } from './plans.service';

@Controller('internal/v1/plans')
export class InternalPlansController {
  constructor(private readonly plans: PlansService) {}

  @Get()
  async list() {
    const data = await this.plans.listActive();
    return { data };
  }
}
