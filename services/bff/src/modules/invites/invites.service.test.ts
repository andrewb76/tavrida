import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { KetoService } from '../keto/keto.service';
import type { LogtoManagementService } from '../logto/logto-management.service';
import type { PlanConfigClient } from '../plan-config/plan-config.client';
import type { ClubSettingsReader } from '../scalar-config/club-settings.reader';
import type {
  InternalInviteRecord,
  ResolvedInvite,
  UserProfileClient,
} from '../user-profile/user-profile.client';
import { INVITE_MONTHLY_LIMIT_KEY } from './invite-quota.logic';
import { InvitesService } from './invites.service';

type StoredInvite = {
  id: string;
  code: string;
  issuerId: string;
  logtoToken: string;
  email?: string;
  expiresAt: string;
  createdAt: string;
  maxUses: number;
  usesCount: number;
};

function createFakeUserProfile() {
  const byCode = new Map<string, StoredInvite>();
  const calls = {
    create: [] as Record<string, unknown>[],
    resolve: [] as Array<{ code?: string; token?: string }>,
    claim: [] as Array<{ userId: string; inviteCodeId?: string; inviterId?: string }>,
  };
  const claimedByUser = new Map<string, { inviterId: string; invitationAcceptedAt: string }>();
  let seq = 0;

  const client = {
    listInvites: async (issuerId: string): Promise<InternalInviteRecord[]> => {
      return [...byCode.values()]
        .filter((row) => row.issuerId === issuerId)
        .map((row) => ({
          id: row.id,
          code: row.code,
          email: row.email,
          usesCount: row.usesCount,
          maxUses: row.maxUses,
          expiresAt: row.expiresAt,
          createdAt: row.createdAt,
          status: 'active' as const,
        }));
    },
    createInvite: async (body: {
      issuerId: string;
      logtoToken: string;
      email?: string;
      expiresAt: string;
      maxUses?: number;
    }) => {
      calls.create.push(body);
      seq += 1;
      const row: StoredInvite = {
        id: `invite-${seq}`,
        code: `TAV-TEST-${String(seq).padStart(4, '0')}`,
        issuerId: body.issuerId,
        logtoToken: body.logtoToken,
        email: body.email,
        expiresAt: body.expiresAt,
        createdAt: new Date().toISOString(),
        maxUses: body.maxUses ?? 1,
        usesCount: 0,
      };
      byCode.set(row.code, row);
      return {
        id: row.id,
        code: row.code,
        email: row.email,
        expiresAt: row.expiresAt,
        createdAt: row.createdAt,
      };
    },
    resolveInvite: async (params: { code?: string; token?: string }): Promise<ResolvedInvite> => {
      calls.resolve.push(params);
      const row = params.code
        ? byCode.get(params.code)
        : [...byCode.values()].find((r) => r.logtoToken === params.token);
      if (!row) throw new Error('not found');
      return {
        token: row.logtoToken,
        email: row.email,
        inviterId: row.issuerId,
        inviteCodeId: row.id,
        code: row.code,
      };
    },
    claimInvite: async (body: {
      userId: string;
      inviteCodeId?: string;
      inviterId?: string;
    }) => {
      calls.claim.push(body);
      const existing = claimedByUser.get(body.userId);
      if (existing) {
        return {
          userId: body.userId,
          inviterId: existing.inviterId,
          invitationAcceptedAt: existing.invitationAcceptedAt,
          claimed: false,
        };
      }
      const row = [...byCode.values()].find((r) => r.id === body.inviteCodeId);
      const inviterId = row?.issuerId ?? body.inviterId;
      if (!inviterId) throw new Error('missing inviter');
      if (row) row.usesCount += 1;
      const invitationAcceptedAt = new Date().toISOString();
      claimedByUser.set(body.userId, { inviterId, invitationAcceptedAt });
      return {
        userId: body.userId,
        inviterId,
        invitationAcceptedAt,
        claimed: true,
      };
    },
  } as unknown as UserProfileClient;

  return { client, calls, byCode, claimedByUser };
}

function createService(opts?: {
  planAllowed?: boolean;
  planLimit?: number | null;
  isAdmin?: boolean;
}) {
  const up = createFakeUserProfile();
  const logtoCalls: Array<{ email: string; expiresIn: number }> = [];

  const logto = {
    createOneTimeToken: async (input: { email: string; expiresIn: number }) => {
      logtoCalls.push(input);
      return {
        token: `ott-${logtoCalls.length}`,
        expiresAt: new Date(Date.now() + input.expiresIn * 1000).toISOString(),
      };
    },
  } as unknown as LogtoManagementService;

  const keto = {
    isPlatformAdmin: async () => opts?.isAdmin ?? false,
  } as unknown as KetoService;

  const clubSettings = {
    inviteValidityDays: async () => 14,
    inviteMaxUses: async () => 1,
  } as unknown as ClubSettingsReader;

  const planConfig = {
    checkLimit: async (body: {
      userId: string;
      variableKey: string;
      requestedValue: number;
      currentUsage: number;
    }) => {
      assert.equal(body.variableKey, INVITE_MONTHLY_LIMIT_KEY);
      const limit = opts?.planLimit === undefined ? 10 : opts.planLimit;
      const allowed = opts?.planAllowed ?? true;
      return {
        allowed,
        planId: 'free',
        limit,
        remaining: allowed && limit != null ? Math.max(0, limit - body.currentUsage) : 0,
      };
    },
  } as unknown as PlanConfigClient;

  const config = {
    get: (key: string) => {
      if (key === 'FRONTEND_ORIGIN') return 'http://localhost:5173';
      if (key === 'CLUB_INVITES_UNLIMITED_ISSUER_IDS') return '';
      if (key === 'CLUB_INVITES_PER_MONTH') return '10';
      return undefined;
    },
  } as unknown as ConfigService;

  const service = new InvitesService(
    logto,
    up.client,
    keto,
    clubSettings,
    planConfig,
    config,
  );

  return { service, up, logtoCalls };
}

describe('InvitesService flow', () => {
  it('create → resolve → mock signIn → claim', async () => {
    const { service, up, logtoCalls } = createService();
    const issuerId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const inviteeId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

    const created = await service.createInvite(issuerId, 'friend@example.com');
    assert.equal(created.code.startsWith('TAV-'), true);
    assert.match(created.link, /\/join\?code=/);
    assert.equal(logtoCalls.length, 1);
    assert.equal(logtoCalls[0]?.email, 'friend@example.com');
    assert.equal(logtoCalls[0]?.expiresIn, 14 * 86400);
    assert.equal(up.calls.create[0]?.logtoToken, 'ott-1');

    const resolved = await service.resolveInvite({ code: created.code });
    assert.equal(resolved.token, 'ott-1');
    assert.equal(resolved.inviterId, issuerId);
    assert.equal(resolved.inviteCodeId, created.id);
    assert.equal(resolved.email, 'friend@example.com');

    // mock Logto signIn: invitee receives JWT with sub=inviteeId, then claims attribution
    const claimed = await service.claimInvite(inviteeId, {
      inviteCodeId: resolved.inviteCodeId,
    });
    assert.equal(claimed.claimed, true);
    assert.equal(claimed.inviterId, issuerId);
    assert.equal(claimed.userId, inviteeId);

    const again = await service.claimInvite(inviteeId, {
      inviteCodeId: resolved.inviteCodeId,
    });
    assert.equal(again.claimed, false);
    assert.equal(again.inviterId, issuerId);
  });

  it('denies create when plan-config monthly limit reached', async () => {
    const { service } = createService({ planAllowed: false, planLimit: 1 });
    await assert.rejects(
      () => service.createInvite('cccccccc-cccc-4ccc-8ccc-cccccccccccc'),
      (err: unknown) => {
        assert.ok(err instanceof ForbiddenException);
        const body = err.getResponse() as { variableKey?: string };
        assert.equal(body.variableKey, INVITE_MONTHLY_LIMIT_KEY);
        return true;
      },
    );
  });

  it('skips quota for platform admin', async () => {
    const { service, logtoCalls } = createService({
      planAllowed: false,
      planLimit: 0,
      isAdmin: true,
    });
    const created = await service.createInvite('dddddddd-dddd-4ddd-8ddd-dddddddddddd');
    assert.ok(created.code);
    assert.equal(logtoCalls.length, 1);
  });
});
