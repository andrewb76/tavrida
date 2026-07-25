import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InviteCodeEntity } from '../../entities/invite-code.entity';
import { UserProfileEntity } from '../../entities/user-profile.entity';
import { UserRatingEntity } from '../../entities/user-rating.entity';
import { AdminCardStatsService } from './admin-card-stats.service';
import { InternalUsersController } from './internal-users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserProfileEntity, InviteCodeEntity, UserRatingEntity])],
  controllers: [InternalUsersController],
  providers: [UsersService, AdminCardStatsService],
  exports: [UsersService, AdminCardStatsService],
})
export class UsersModule {}
