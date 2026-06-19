import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { UserBanHistory } from './entities/ban-history.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserBanHistory])
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService, TypeOrmModule], // Экспортируем TypeOrmModule, чтобы autoLoadEntities подхватил таблицы
})
export class UsersModule {}
