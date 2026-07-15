import { Module } from '@nestjs/common';
import { ActAsService } from './act-as.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { OptionalJwtAuthGuard } from './optional-jwt-auth.guard';

@Module({
  providers: [ActAsService, JwtAuthGuard, OptionalJwtAuthGuard],
  exports: [ActAsService, JwtAuthGuard, OptionalJwtAuthGuard],
})
export class AuthModule {}
