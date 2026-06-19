import { Controller, Post, Delete, Body, Param, ParseUUIDPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { BanUserDto } from './dto/ban-user.dto';
import { User } from './entities/user.entity';

@ApiTags('Панель Модерации (Admin & Moderation)')
@ApiBearerAuth()
@Controller('api/admin/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('ban')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Заблокировать пользователя (Выдать бан)', description: 'Вносит ограничение в профиль и фиксирует лог в таблице аудита.' })
  @ApiResponse({ status: 200, type: User })
  async banUser(@Body() dto: BanUserDto) {
    const mockModeratorId = 'admin-logto-uuid-999'; // В проде берется из JWT-токена
    return await this.usersService.banUser(dto, mockModeratorId);
  }

  @Delete(':id/unban')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Досрочно разблокировать пользователя' })
  @ApiResponse({ status: 200, type: User })
  async unbanUser(@Param('id', ParseUUIDPipe) id: string) {
    return await this.usersService.unbanUser(id);
  }
}
