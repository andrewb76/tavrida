import { Module } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { AuthModule } from '../auth/auth.module';
import { EventsModule } from '../events/events.module';
import { LogtoModule } from '../logto/logto.module';
import { MediaModule } from '../media/media.module';
import { ScalarConfigModule } from '../scalar-config/scalar-config.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { UserProfileModule } from '../user-profile/user-profile.module';
import { AdminForumController } from './admin-forum.controller';
import { ForumAuthorsService } from './forum-authors.service';
import { ForumScalarBootstrapService } from './forum-scalar-bootstrap.service';
import { ForumClient } from './forum.client';
import { ForumController } from './forum.controller';

@Module({
  imports: [
    AuthModule,
    MediaModule,
    UserProfileModule,
    ScalarConfigModule,
    LogtoModule,
    SubscriptionsModule,
    EventsModule,
  ],
  controllers: [ForumController, AdminForumController],
  providers: [ForumClient, ForumAuthorsService, ForumScalarBootstrapService, AdminGuard],
})
export class ForumModule {}
