import { Module } from '@nestjs/common';
import { TagEventsPublisher } from './tag-events.publisher';

@Module({
  providers: [TagEventsPublisher],
  exports: [TagEventsPublisher],
})
export class EventsModule {}
