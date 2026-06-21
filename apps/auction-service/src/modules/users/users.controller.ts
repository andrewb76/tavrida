import { Controller, Post, Delete, Body, Param, ParseUUIDPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { BanUserDto } from './dto/ban-user.dto';
import { User } from './entities/user.entity';
import { CurrentUser } from '../auth/user.decorator';
import { Roles } from '../auth/roles.decorator';

@ApiTags('Панель Модерации (Admin & Moderation)')
@ApiBearerAuth()
@Controller('api/admin/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('ban')
  @Roles('admin', 'moderator')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Заблокировать пользователя (Выдать бан)', description: 'Вносит ограничение в профиль и фиксирует лог в таблице аудита.' })
  @ApiResponse({ status: 200, type: User })
  async banUser(
    @Body() dto: BanUserDto,
    @CurrentUser() user: User
  ) {
    return await this.usersService.banUser(dto, user.logtoId);
  }

  @Delete(':id/unban')
  @Roles('admin', 'moderator')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Досрочно разблокировать пользователя' })
  @ApiResponse({ status: 200, type: User })
  async unbanUser(@Param('id', ParseUUIDPipe) id: string) {
    return await this.usersService.unbanUser(id);
  }
}
