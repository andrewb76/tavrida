import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { MetricsService } from './metrics.service';
import { Public } from '../../common/decorators/public.decorator';

@Controller('metrics')
export class MetricsController {
  constructor(private metricsService: MetricsService) {}

  @Get()
  @Public()
  async getMetrics(@Res() res: Response) {
    res.set('Content-Type', 'text/plain; version=0.0.4');
    const metrics = await this.metricsService.getMetrics();
    res.send(metrics);
  }
}
