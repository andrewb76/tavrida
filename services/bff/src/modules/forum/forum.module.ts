import { Module } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { AuthModule } from '../auth/auth.module';
import { MediaModule } from '../media/media.module';
import { AdminForumController } from './admin-forum.controller';
import { ForumClient } from './forum.client';
import { ForumController } from './forum.controller';

@Module({
  imports: [AuthModule, MediaModule],
  controllers: [ForumController, AdminForumController],
  providers: [ForumClient, AdminGuard],
})
export class ForumModule {}
