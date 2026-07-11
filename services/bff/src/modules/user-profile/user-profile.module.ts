import { Module } from '@nestjs/common';
import { UserProfileClient } from './user-profile.client';

@Module({
  providers: [UserProfileClient],
  exports: [UserProfileClient],
})
export class UserProfileModule {}
