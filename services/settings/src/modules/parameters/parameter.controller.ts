import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { RegisterParameterDto, SyncParametersDto } from './dto/parameters.dto';
import { ParameterService } from './parameter.service';

@Controller('internal/v1/parameters')
export class ParameterController {
  constructor(private readonly parameter: ParameterService) {}

  @Post('register')
  register(@Body() body: RegisterParameterDto) {
    return this.parameter.register(body);
  }

  @Post('sync')
  sync(@Body() body: SyncParametersDto) {
    return this.parameter.sync(body);
  }

  @Get()
  list(
    @Query('service') service?: string,
    @Query('category') category?: string,
  ) {
    return this.parameter.list(service, category);
  }

  @Get(':key')
  findOne(@Param('key') key: string) {
    return this.parameter.findOne(key);
  }

  @Delete(':key')
  remove(@Param('key') key: string) {
    return this.parameter.remove(key);
  }
}
