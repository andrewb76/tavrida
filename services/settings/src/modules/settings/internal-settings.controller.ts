import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { RegisterSettingsDto } from './dto/settings.dto';
import { SettingsService } from './settings.service';

@Controller('internal/v1/settings')
export class InternalSettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Post('register')
  register(@Body() body: RegisterSettingsDto) {
    return this.settings.register(body.keys);
  }

  @Get('public')
  getPublic() {
    return this.settings.getPublic();
  }

  @Get(':domain')
  getDomain(@Param('domain') domain: string) {
    return this.settings.getDomain(domain);
  }

  @Post(':domain')
  patchDomain(
    @Param('domain') domain: string,
    @Body() body: Record<string, unknown>,
  ) {
    const updatedBy =
      typeof body.updatedBy === 'string' ? body.updatedBy : undefined;
    const { updatedBy: _omit, ...patch } = body;
    return this.settings.patchDomain(domain, patch, updatedBy);
  }
}
