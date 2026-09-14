import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { SystemValueService } from './system-value.service';

@Controller('internal/v1/system-values')
export class SystemValueController {
  constructor(private readonly systemValue: SystemValueService) {}

  @Get('public')
  getPublic() {
    return this.systemValue.getPublic();
  }

  @Get(':domain')
  getDomain(@Param('domain') domain: string) {
    return this.systemValue.getDomain(domain);
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
    return this.systemValue.patchDomain(domain, patch, updatedBy);
  }
}
