import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Repository } from 'typeorm';
import type { InvitationEntity } from '../../entities/invitation.entity';
import type { InviteCodeEntity } from '../../entities/invite-code.entity';
import type { UserProfileEntity } from '../../entities/user-profile.entity';
import type { InviteEventsPublisher } from '../events/invite-events.publisher';
import { InvitesService } from './invites.service';

describe('InvitesService.claim', () => {
  it('publishes invitation.redeemed once on first claim', async () => {
    const code: InviteCodeEntity = {
      id: 'code-1',
      code: 'TAV-TEST-0001',
      issuerId: 'inviter-1',
      logtoToken: 'ott-1',
      email: null,
      maxUses: 1,
      usesCount: 0,
      expiresAt: new Date('2099-01-01T00:00:00.000Z'),
      createdAt: new Date('2026-07-01T00:00:00.000Z'),
    } as InviteCodeEntity;

    const profiles = new Map<string, UserProfileEntity>();
    const published: unknown[] = [];

    const inviteCodes = {
      findOne: async ({ where }: { where: { id?: string } }) =>
        where.id === code.id ? code : null,
      save: async (row: InviteCodeEntity) => row,
    } as unknown as Repository<InviteCodeEntity>;

    const profileRepo = {
      findOne: async ({ where }: { where: { userId: string } }) =>
        profiles.get(where.userId) ?? null,
      create: (data: Partial<UserProfileEntity>) =>
        ({
          inviterId: null,
          invitationAcceptedAt: null,
          ...data,
        }) as UserProfileEntity,
      save: async (row: UserProfileEntity) => {
        profiles.set(row.userId, row);
        return row;
      },
    } as unknown as Repository<UserProfileEntity>;

    const invitations = {
      create: (data: Partial<InvitationEntity>) => data as InvitationEntity,
      save: async (row: InvitationEntity) => row,
    } as unknown as Repository<InvitationEntity>;

    const inviteEvents = {
      publishInvitationRedeemed: async (payload: unknown) => {
        published.push(payload);
        return { published: true, eventId: 'evt-1' };
      },
    } as unknown as InviteEventsPublisher;

    const service = new InvitesService(inviteCodes, profileRepo, invitations, inviteEvents);

    const first = await service.claim({
      userId: 'invitee-1',
      inviteCodeId: 'code-1',
    });
    assert.equal(first.claimed, true);
    assert.equal(published.length, 1);
    assert.deepEqual(published[0], {
      inviteeId: 'invitee-1',
      inviterId: 'inviter-1',
      inviteCodeId: 'code-1',
      acceptedAt: first.invitationAcceptedAt,
    });

    const second = await service.claim({
      userId: 'invitee-1',
      inviteCodeId: 'code-1',
    });
    assert.equal(second.claimed, false);
    assert.equal(published.length, 1);
  });
});
