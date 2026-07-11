import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserProfileEntity } from '../../entities/user-profile.entity';
import { InternalUsersController } from './internal-users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserProfileEntity])],
  controllers: [InternalUsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
