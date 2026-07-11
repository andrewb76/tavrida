import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ResolveRateLimitGuard } from '../../common/resolve-rate-limit.guard';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ClaimInviteDto, CreateInviteDto } from './dto/invites.dto';
import { InvitesService } from './invites.service';

@Controller('invites')
export class InvitesController {
  constructor(private readonly invites: InvitesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser() user: AuthUser, @Body() body: CreateInviteDto) {
    return this.invites.createInvite(user.sub, body.email);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  list(@CurrentUser() user: AuthUser, @Query('limit') limit?: string) {
    return this.invites.listInvites(user.sub, limit ? Number(limit) : 20);
  }

  @Get('resolve')
  @UseGuards(ResolveRateLimitGuard)
  resolve(@Query('code') code?: string, @Query('token') token?: string) {
    if (!code?.trim() && !token?.trim()) {
      throw new BadRequestException({
        type: 'validation-error',
        detail: 'code or token query parameter is required',
      });
    }
    return this.invites.resolveInvite({ code, token });
  }

  @Post('claim')
  @UseGuards(JwtAuthGuard)
  claim(@CurrentUser() user: AuthUser, @Body() body: ClaimInviteDto) {
    if (!body.inviteCodeId && !body.inviterId) {
      throw new BadRequestException({
        type: 'validation-error',
        detail: 'inviteCodeId or inviterId is required',
      });
    }
    return this.invites.claimInvite(user.sub, body);
  }
}
