import {
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KetoService } from '../keto/keto.service';
import { PlanConfigClient } from '../plan-config/plan-config.client';
import { ClubSettingsReader } from '../scalar-config/club-settings.reader';
import { UserProfileClient } from '../user-profile/user-profile.client';
import {
  countInvitesCreatedThisMonth,
  INVITE_MONTHLY_LIMIT_KEY,
  isUnknownPlanLimit,
} from './invite-quota.logic';

@Injectable()
export class InvitesService {
  constructor(
    private readonly userProfile: UserProfileClient,
    private readonly keto: KetoService,
    private readonly clubSettings: ClubSettingsReader,
    private readonly planConfig: PlanConfigClient,
    private readonly config: ConfigService,
  ) {}

  private frontendOrigin(): string {
    return (this.config.get<string>('FRONTEND_ORIGIN') ?? 'http://localhost:5173').replace(
      /\/$/,
      '',
    );
  }

  private async inviteValiditySeconds(): Promise<number> {
    const days = await this.clubSettings.inviteValidityDays();
    return days * 86400;
  }

  private buildLink(code: string): string {
    return `${this.frontendOrigin()}/join?code=${encodeURIComponent(code)}`;
  }

  async createInvite(issuerId: string, email?: string) {
    await this.assertInviteQuota(issuerId);

    const inviteEmail = email?.trim() || undefined;
    const expiresIn = await this.inviteValiditySeconds();
    const maxUses = await this.clubSettings.inviteMaxUses();
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    const record = await this.userProfile.createInvite({
      issuerId,
      email: inviteEmail,
      expiresAt,
      maxUses,
    });

    return {
      id: record.id,
      code: record.code,
      link: this.buildLink(record.code),
      email: record.email,
      expiresAt: record.expiresAt,
      createdAt: record.createdAt,
    };
  }

  async listInvites(issuerId: string, limit = 20) {
    const data = await this.userProfile.listInvites(issuerId, limit);
    return {
      data: data.map((item) => ({
        ...item,
        link: this.buildLink(item.code),
      })),
      pagination: { nextCursor: null, hasMore: false },
    };
  }

  resolveInvite(params: { code?: string }) {
    return this.userProfile.resolveInvite(params);
  }

  claimInvite(
    userId: string,
    body: { inviteCodeId?: string; inviterId?: string },
  ) {
    return this.userProfile.claimInvite({ userId, ...body });
  }

  /**
   * Quota: plan-config `club.member.invite.monthlyMax` (primary).
   * Admins and CLUB_INVITES_UNLIMITED_ISSUER_IDS skip the limit.
   */
  private async assertInviteQuota(issuerId: string) {
    if (await this.keto.isPlatformAdmin(issuerId)) return;

    const unlimited = (this.config.get<string>('CLUB_INVITES_UNLIMITED_ISSUER_IDS') ?? '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);
    if (unlimited.includes(issuerId)) return;

    const invites = await this.userProfile.listInvites(issuerId, 100);
    const currentUsage = countInvitesCreatedThisMonth(invites);

    const check = await this.planConfig.checkLimit({
      userId: issuerId,
      variableKey: INVITE_MONTHLY_LIMIT_KEY,
      requestedValue: 1,
      currentUsage,
    });

    if (isUnknownPlanLimit(check) || check.reason) {
      throw new ServiceUnavailableException({
        type: 'plan_policy_unavailable',
        detail: `Invite policy ${INVITE_MONTHLY_LIMIT_KEY} is not enforceable`,
        variableKey: INVITE_MONTHLY_LIMIT_KEY,
      });
    }
    if (!check.allowed) {
      throw new ForbiddenException({
        type: 'forbidden',
        detail: `Monthly invite limit reached (${check.limit ?? 0})`,
        variableKey: INVITE_MONTHLY_LIMIT_KEY,
        limit: check.limit,
        currentUsage,
        planId: check.planId,
      });
    }
  }
}
