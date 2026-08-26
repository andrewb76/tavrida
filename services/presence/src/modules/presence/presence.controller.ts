import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { PresenceService } from './presence.service';
import { HeartbeatDto, BatchDto, VisibilityDto } from './presence.dto';

@Controller('internal/v1/presence')
export class PresenceController {
  constructor(private readonly presence: PresenceService) {}

  @Post('heartbeat')
  async heartbeat(@Body() dto: HeartbeatDto) {
    await this.presence.heartbeat(dto.user_id, dto.visibility, dto.last_activity_at);
    return { ok: true };
  }

  @Get(':userId')
  async getStatus(@Param('userId') userId: string) {
    return this.presence.getStatus(userId);
  }

  @Post('batch')
  async batch(@Body() dto: BatchDto) {
    const presences = await this.presence.batch(dto.user_ids);
    return { presences };
  }

  @Post('visibility')
  async visibility(@Body() dto: VisibilityDto) {
    await this.presence.setVisibility(dto.user_id, dto.visibility);
    return { ok: true };
  }
}
