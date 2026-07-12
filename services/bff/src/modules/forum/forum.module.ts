import { Module } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { AuthModule } from '../auth/auth.module';
import { MediaModule } from '../media/media.module';
import { UserProfileModule } from '../user-profile/user-profile.module';
import { AdminForumController } from './admin-forum.controller';
import { ForumAuthorsService } from './forum-authors.service';
import { ForumClient } from './forum.client';
import { ForumController } from './forum.controller';

@Module({
  imports: [AuthModule, MediaModule, UserProfileModule],
  controllers: [ForumController, AdminForumController],
  providers: [ForumClient, ForumAuthorsService, AdminGuard],
})
export class ForumModule {}
