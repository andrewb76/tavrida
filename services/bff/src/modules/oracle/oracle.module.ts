import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminGuard } from '../auth/admin.guard';
import { OracleController } from './oracle.controller';
import { OracleService } from './oracle.service';

@Module({
  imports: [AuthModule],
  controllers: [OracleController],
  providers: [OracleService, AdminGuard],
})
export class OracleModule {}
