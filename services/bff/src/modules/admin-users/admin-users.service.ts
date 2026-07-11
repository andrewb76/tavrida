import { ForbiddenException, Injectable } from '@nestjs/common';
import { BillingClient } from '../billing/billing.client';
import {
  assertCanRevokeAdmin,
  diffPlatformRoles,
  type RoleToggleInput,
} from '../keto/keto-platform';
import { KetoService } from '../keto/keto.service';
import { UserProfileClient } from '../user-profile/user-profile.client';

@Injectable()
export class AdminUsersService {
  constructor(
    private readonly profiles: UserProfileClient,
    private readonly billing: BillingClient,
    private readonly keto: KetoService,
  ) {}

  async listUsers(params: { offset?: number; limit?: number; q?: string }) {
    const result = await this.profiles.listUsers(params);
    const enriched = await Promise.all(
      result.data.map(async (row) => {
        const [roles, balance] = await Promise.all([
          this.keto.getPlatformRoles(row.userId),
          this.billing.getBalance(row.userId).catch(() => ({
            userId: row.userId,
            balance: 0,
            currency: 'RUB',
          })),
        ]);

        return {
          userId: row.userId,
          displayName: row.displayName,
          email: row.email,
          username: row.username,
          avatarUrl: row.avatarUrl,
          isSuspended: row.isSuspended,
          inviterId: row.inviterId,
          invitationAcceptedAt: row.invitationAcceptedAt,
          logtoSyncedAt: row.logtoSyncedAt,
          createdAt: row.createdAt,
          roles,
          balance: balance.balance,
          currency: balance.currency,
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
}
