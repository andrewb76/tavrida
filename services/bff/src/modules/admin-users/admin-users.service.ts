import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  ForbiddenException,
} from '@nestjs/common';
import { BillingClient } from '../billing/billing.client';
import { ForumClient } from '../forum/forum.client';
import {
  assertCanRevokeAdmin,
  diffPlatformRoles,
  type RoleToggleInput,
} from '../keto/keto-platform';
import { KetoService } from '../keto/keto.service';
import { LogtoManagementService } from '../logto/logto-management.service';
import {
  INVITE_MONTHLY_LIMIT_KEY,
  isUnknownPlanLimit,
} from '../invites/invite-quota.logic';
import { PlanConfigClient } from '../plan-config/plan-config.client';
import { UserProfileClient } from '../user-profile/user-profile.client';

@Injectable()
export class AdminUsersService {
  constructor(
    private readonly profiles: UserProfileClient,
    private readonly billing: BillingClient,
    private readonly keto: KetoService,
    private readonly planConfig: PlanConfigClient,
    private readonly forum: ForumClient,
    private readonly logto: LogtoManagementService,
  ) {}

  async listUsers(params: { offset?: number; limit?: number; q?: string }) {
    const result = await this.profiles.listUsers({ ...params, includeDeleted: true });
    const ids = result.data.map((row) => row.userId);
    const inviterIds = [
      ...new Set(
        result.data.map((row) => row.inviterId).filter((id): id is string => Boolean(id)),
      ),
    ];

    const [cardStatsRaw, membershipsRes, inviters] = await Promise.all([
      this.profiles.getAdminCardStats(ids).catch(() => ({}) as Record<string, never>),
      this.forum.membershipsByUsers(ids).catch(() => ({ data: {} as Record<string, never> })),
      inviterIds.length
        ? this.profiles.lookupByIds(inviterIds).catch(() => [])
        : Promise.resolve([]),
    ]);

    const cardStats: Record<string, (typeof cardStatsRaw)[string] | undefined> = cardStatsRaw;

    const inviterNameById = new Map(
      inviters.map((row) => [
        row.userId,
        row.displayName?.trim() || row.username?.trim() || null,
      ]),
    );
    const memberships = membershipsRes.data ?? {};

    const enriched = await Promise.all(
      result.data.map(async (row) => {
        const stats = cardStats[row.userId];
        const [roles, balance, subscription, inviteQuota] = await Promise.all([
          this.keto.getPlatformRoles(row.userId),
          this.billing.getBalance(row.userId).catch(() => ({
            userId: row.userId,
            balance: 0,
            currency: 'RUB',
          })),
          this.planConfig.getSubscription(row.userId).catch(() => ({
            userId: row.userId,
            planId: 'free',
            status: 'ACTIVE',
            autoRenew: false,
            startsAt: null as string | null,
            expiresAt: null as string | null,
          })),
          this.resolveInviteQuota(row.userId, stats?.invitesThisMonth ?? 0),
        ]);

        return {
          userId: row.userId,
          displayName: row.displayName,
          email: row.email,
          username: row.username,
          avatarUrl: row.avatarUrl,
          isSuspended: row.isSuspended,
          isHardLocked: Boolean(row.isHardLocked),
          hardLockedAt: row.hardLockedAt ?? null,
          inviterId: row.inviterId,
          inviterDisplayName: row.inviterId
            ? (inviterNameById.get(row.inviterId) ?? null)
            : null,
          invitationAcceptedAt: row.invitationAcceptedAt,
          deletedAt: row.deletedAt ?? null,
          logtoSyncedAt: row.logtoSyncedAt,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          roles,
          balance: balance.balance,
          currency: balance.currency,
          rating: {
            totalRating: stats?.totalRating ?? 0,
            karma: stats?.karma ?? 0,
            effectiveKarma: stats?.effectiveKarma ?? 0,
            effectiveRating: stats?.effectiveRating ?? 0,
            verifiedSales: stats?.verifiedSales ?? 0,
            pendingSales: stats?.pendingSales ?? 0,
            feedbackCoverage: stats?.feedbackCoverage ?? null,
            banUntil: stats?.banUntil ?? null,
            isLimited: stats?.isLimited ?? false,
          },
          invites: {
            issued: stats?.invitesIssued ?? 0,
            thisMonth: stats?.invitesThisMonth ?? 0,
            monthlyLimit: inviteQuota.limit,
            remaining: inviteQuota.remaining,
          },
          referral: {
            l1: stats?.referralL1 ?? 0,
            l2: stats?.referralL2 ?? 0,
          },
          plan: {
            planId: subscription.planId,
            status: subscription.status,
            autoRenew: subscription.autoRenew,
            expiresAt: subscription.expiresAt,
          },
          accessGroups: memberships[row.userId] ?? [],
        };
      }),
    );

    return { data: enriched, pagination: result.pagination };
  }

  async patchRoles(actorId: string, targetUserId: string, desired: RoleToggleInput) {
    const current = await this.keto.getPlatformRoles(targetUserId);
    const { grants, revokes } = diffPlatformRoles(current, desired);

    try {
      assertCanRevokeAdmin(actorId, targetUserId, revokes);
    } catch (error) {
      throw new ForbiddenException({
        type: 'forbidden',
        detail: error instanceof Error ? error.message : 'Role change not allowed',
      });
    }

    for (const relation of grants) {
      await this.keto.grantPlatformRole(targetUserId, relation);
    }
    for (const relation of revokes) {
      await this.keto.revokePlatformRole(targetUserId, relation);
    }

    return { userId: targetUserId, roles: await this.keto.getPlatformRoles(targetUserId) };
  }

  async adminDeposit(
    actorId: string,
    targetUserId: string,
    amount: number,
    description?: string,
  ) {
    await this.profiles.ensureUser(targetUserId);

    const result = await this.billing.deposit({
      userId: targetUserId,
      amount,
      description: description ?? `Admin top-up by ${actorId}`,
    });

    const balance = await this.billing.getBalance(targetUserId);
    return { ...result, balance: balance.balance, currency: balance.currency };
  }

  async listWalletTransactions(targetUserId: string, limit = 50) {
    await this.profiles.ensureUser(targetUserId);
    const data = await this.billing.listTransactions(targetUserId, limit);
    return { data };
  }

  async forceSyncFromLogto(targetUserId: string) {
    if (!this.logto.isConfigured) {
      throw new ServiceUnavailableException({
        type: 'logto_unavailable',
        detail: 'Logto Management API is not configured',
      });
    }

    const logtoUser = await this.logto.getUser(targetUserId);
    if (!logtoUser) {
      throw new NotFoundException({
        type: 'not-found',
        detail: `User ${targetUserId} not found in Logto`,
      });
    }

    await this.profiles.syncFromLogto({
      userId: targetUserId,
      name: logtoUser.name,
      username: logtoUser.username,
      primaryEmail: logtoUser.primaryEmail,
      avatar: logtoUser.avatar,
      isSuspended: logtoUser.isSuspended,
    });

    const [profile] = await this.profiles.lookupByIds([targetUserId]);
    return {
      userId: targetUserId,
      synced: true,
      displayName: profile?.displayName ?? logtoUser.name,
      email: logtoUser.primaryEmail,
      username: logtoUser.username,
      avatarUrl: profile?.avatarUrl ?? logtoUser.avatar,
      isSuspended: logtoUser.isSuspended,
      logtoSyncedAt: new Date().toISOString(),
    };
  }

  async setHardLock(actorId: string, targetUserId: string, locked: boolean) {
    if (actorId === targetUserId) {
      throw new ForbiddenException({
        type: 'forbidden',
        detail: 'Нельзя заблокировать собственный аккаунт',
      });
    }

    const targetRoles = await this.keto.getPlatformRoles(targetUserId);
    if (targetRoles.includes('admin')) {
      throw new ForbiddenException({
        type: 'forbidden',
        detail: 'Нельзя заблокировать администратора',
      });
    }

    await this.profiles.ensureUser(targetUserId);
    const row = await this.profiles.setHardLock(targetUserId, locked, actorId);
    return {
      userId: row.userId,
      isHardLocked: row.isHardLocked,
      hardLockedAt: row.hardLockedAt,
      hardLockedBy: row.hardLockedBy,
    };
  }

  private async resolveInviteQuota(userId: string, invitesThisMonth: number) {
    try {
      const check = await this.planConfig.checkLimit({
        userId,
        variableKey: INVITE_MONTHLY_LIMIT_KEY,
        requestedValue: 0,
        currentUsage: invitesThisMonth,
      });
      if (isUnknownPlanLimit(check)) {
        return { limit: null as number | null, remaining: null as number | null };
      }
      return { limit: check.limit, remaining: check.remaining };
    } catch {
      return { limit: null as number | null, remaining: null as number | null };
    }
  }
}
