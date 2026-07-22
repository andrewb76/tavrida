import { Module } from '@nestjs/common';
import { ForumEventsPublisher } from './forum-events.publisher';

@Module({
  providers: [ForumEventsPublisher],
  exports: [ForumEventsPublisher],
})
export class ForumEventsModule {}
