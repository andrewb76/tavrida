import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvitationEntity } from '../../entities/invitation.entity';
import { InviteCodeEntity } from '../../entities/invite-code.entity';
import { UserProfileEntity } from '../../entities/user-profile.entity';
import { InviteEventsPublisher } from '../events/invite-events.publisher';
import { InternalInvitesController } from './internal-invites.controller';
import { InvitesService } from './invites.service';

@Module({
  imports: [TypeOrmModule.forFeature([InviteCodeEntity, UserProfileEntity, InvitationEntity])],
  controllers: [InternalInvitesController],
  providers: [InvitesService, InviteEventsPublisher],
  exports: [InvitesService],
})
export class InvitesModule {}
