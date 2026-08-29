import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { PresenceClient } from './presence.client';

class HeartbeatDto {
  @IsOptional()
  @IsString()
  visibility?: 'visible' | 'hidden';
}

@Controller('presence')
@UseGuards(JwtAuthGuard)
export class PresenceController {
  constructor(private readonly presence: PresenceClient) {}

  @Post('heartbeat')
  async heartbeat(@CurrentUser() user: AuthUser, @Body() body: HeartbeatDto) {
    await this.presence.heartbeat(user.sub, body.visibility ?? 'visible');
    return { ok: true };
  }
}
