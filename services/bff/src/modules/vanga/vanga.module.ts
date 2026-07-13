import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminGuard } from '../auth/admin.guard';
import { VangaController } from './vanga.controller';
import { VangaService } from './vanga.service';

@Module({
  imports: [AuthModule],
  controllers: [VangaController],
  providers: [VangaService, AdminGuard],
})
export class VangaModule {}
