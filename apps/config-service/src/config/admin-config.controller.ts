// src/config/admin-config.controller.ts
import { Controller, Get, Put, Delete, Body, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ConfigService } from './config.service';
import { UpdateConfigDto } from './dto/update-config.dto';
import { AdminRoleGuard } from '../common/guards/admin-role.guard';

@ApiTags('Admin Configs')
@ApiBearerAuth()
@UseGuards(AdminRoleGuard) // проверяет роль admin/moderator
@Controller('api/admin/configs')
export class AdminConfigController {
  constructor(private readonly configService: ConfigService) {}

  @Get()
  @ApiOperation({ summary: 'Получить все настройки (включая неактивные)' })
  async findAll() {
    return await this.configService.findAll();
  }

  @Put(':id')
  @ApiOperation({ summary: 'Обновить значение или описание настройки' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateConfigDto,
  ) {
    return await this.configService.update(id, {
      value: dto.value,
      value_description: dto.value_description,
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Деактивировать настройку (мягкое удаление)' })
  async deactivate(@Param('id', ParseUUIDPipe) id: string) {
    await this.configService.deactivate(id);
    return { success: true };
  }
}
