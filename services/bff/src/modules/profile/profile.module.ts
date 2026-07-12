import { Module } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { AuthModule } from '../auth/auth.module';
import { UserProfileModule } from '../user-profile/user-profile.module';
import { ProfileController } from './profile.controller';

@Module({
  imports: [AuthModule, UserProfileModule],
  controllers: [ProfileController],
  providers: [AdminGuard],
})
export class ProfileModule {}
