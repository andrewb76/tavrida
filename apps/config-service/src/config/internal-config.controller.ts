// src/config/internal-config.controller.ts
import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ConfigService } from './config.service';
import { SyncConfigDto } from './dto/sync-config.dto';
import { InternalAuthGuard } from '../common/guards/internal-auth.guard';

@UseGuards(InternalAuthGuard) // проверяет внутренний токен
@Controller('api/internal/config')
export class InternalConfigController {
  constructor(private configService: ConfigService) {}

  @Get(':service')
  async getServiceConfig(@Param('service') service: string) {
    return await this.configService.findActiveByService(service);
  }

  @Post(':service/sync')
  async sync(@Param('service') service: string, @Body() dto: SyncConfigDto) {
    return await this.configService.sync(service, dto.defaults);
  }
}
