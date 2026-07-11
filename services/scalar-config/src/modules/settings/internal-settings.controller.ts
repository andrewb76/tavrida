import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { RegisterScalarVariablesDto, SyncScalarVariablesDto } from './dto/settings.dto';
import { SettingsService } from './settings.service';

@Controller('internal/v1/scalar-variables')
export class InternalSettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Post('register')
  register(@Body() body: RegisterScalarVariablesDto) {
    return this.settings.register(body.keys);
  }

  @Post('sync')
  sync(@Body() body: SyncScalarVariablesDto) {
    return this.settings.sync(body);
  }

  @Get('registry')
  listRegistry() {
    return this.settings.listRegistry();
  }

  @Delete(':key')
  deleteKey(@Param('key') key: string) {
    return this.settings.deleteKey(key);
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
    const patch = { ...body };
    delete patch.updatedBy;
    return this.settings.patchDomain(domain, patch, updatedBy);
  }
}
