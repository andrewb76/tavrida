import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UserProfileModule } from '../user-profile/user-profile.module';
import { MeController } from './me.controller';
import { MeService } from './me.service';

@Module({
  imports: [AuthModule, UserProfileModule],
  controllers: [MeController],
  providers: [MeService],
})
export class MeModule {}
