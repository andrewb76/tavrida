import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MeService } from './me.service';

@Controller('me')
export class MeController {
  constructor(private readonly me: MeService) {}

  @Get('roles')
  @UseGuards(JwtAuthGuard)
  getRoles(@CurrentUser() user: AuthUser) {
    return this.me.getRoles(user.sub);
  }
}
