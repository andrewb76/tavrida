import { Body, Controller, Delete, Get, Param, Patch } from '@nestjs/common';
import { UpdateUserValueDto } from './dto/user-values.dto';
import { UserValueService } from './user-value.service';

@Controller('internal/v1/user-values')
export class UserValueController {
  constructor(private readonly userValue: UserValueService) {}

  @Get(':userId')
  getValues(@Param('userId') userId: string) {
    return this.userValue.getValues(userId);
  }

  @Get(':userId/:key')
  getValue(@Param('userId') userId: string, @Param('key') key: string) {
    return this.userValue.getValue(userId, key);
  }

  @Patch(':userId/:key')
  upsert(
    @Param('userId') userId: string,
    @Param('key') key: string,
    @Body() body: UpdateUserValueDto,
  ) {
    return this.userValue.upsert(userId, key, body.value);
  }

  @Delete(':userId/:key')
  remove(@Param('userId') userId: string, @Param('key') key: string) {
    return this.userValue.remove(userId, key);
  }
}
