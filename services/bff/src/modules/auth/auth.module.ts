import { Global, Module } from '@nestjs/common';
import { UserProfileModule } from '../user-profile/user-profile.module';
import { ActAsService } from './act-as.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { OptionalJwtAuthGuard } from './optional-jwt-auth.guard';

/** Global so `@UseGuards(JwtAuthGuard)` works in every feature module (ActAsService + hard-lock DI). */
@Global()
@Module({
  imports: [UserProfileModule],
  providers: [ActAsService, JwtAuthGuard, OptionalJwtAuthGuard],
  // Re-export UserProfileModule: guard deps are resolved in the controller's module context.
  exports: [ActAsService, JwtAuthGuard, OptionalJwtAuthGuard, UserProfileModule],
})
export class AuthModule {}
