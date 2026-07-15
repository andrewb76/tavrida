import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'node:crypto';
import { KetoService } from '../keto/keto.service';
import { LogtoManagementService } from '../logto/logto-management.service';
import { PlanConfigClient } from '../plan-config/plan-config.client';
import { ClubSettingsReader } from '../scalar-config/club-settings.reader';
import { UserProfileClient } from '../user-profile/user-profile.client';
import {
  countInvitesCreatedThisMonth,
  DEFAULT_INVITES_PER_MONTH_FALLBACK,
  INVITE_MONTHLY_LIMIT_KEY,
  isUnknownPlanLimit,
  resolveEnvInviteLimit,
} from './invite-quota.logic';

const LINK_ONLY_EMAIL_DOMAIN = 'invite.tavrida-lot.localhost';

@Injectable()
export class InvitesService {
  private readonly logger = new Logger(InvitesService.name);

  constructor(
    private readonly logto: LogtoManagementService,
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

    const inviteEmail = email?.trim() || this.generateLinkOnlyEmail();
    const expiresIn = await this.inviteValiditySeconds();
    const maxUses = await this.clubSettings.inviteMaxUses();
    const ott = await this.logto.createOneTimeToken({ email: inviteEmail, expiresIn });
    const expiresAt = ott.expiresAt;

    const record = await this.userProfile.createInvite({
      issuerId,
      logtoToken: ott.token,
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

  resolveInvite(params: { code?: string; token?: string }) {
    return this.userProfile.resolveInvite(params);
  }

  claimInvite(
    userId: string,
    body: { inviteCodeId?: string; inviterId?: string },
  ) {
    return this.userProfile.claimInvite({ userId, ...body });
  }

  private generateLinkOnlyEmail(): string {
    const slot = randomBytes(10).toString('base64url').toLowerCase();
    return `invite-${slot}@${LINK_ONLY_EMAIL_DOMAIN}`;
  }

  /**
   * Quota: plan-config `club.member.invite.monthlyMax` (primary).
   * Env `CLUB_INVITES_PER_MONTH` — fallback if plan-config unavailable / unknown key.
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

    try {
      const check = await this.planConfig.checkLimit({
        userId: issuerId,
        variableKey: INVITE_MONTHLY_LIMIT_KEY,
        requestedValue: 1,
        currentUsage,
      });

      if (isUnknownPlanLimit(check)) {
        this.logger.warn(
          `plan-config unknown ${INVITE_MONTHLY_LIMIT_KEY} — falling back to CLUB_INVITES_PER_MONTH`,
        );
        this.assertEnvInviteQuota(currentUsage);
        return;
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
      return;
    } catch (error) {
      if (error instanceof ForbiddenException) throw error;
      this.logger.warn(
        `plan-config checkLimit failed — env fallback: ${
          error instanceof Error ? error.message : error
        }`,
      );
      this.assertEnvInviteQuota(currentUsage);
    }
  }

  private assertEnvInviteQuota(currentUsage: number) {
    const limit = resolveEnvInviteLimit(
      this.config.get<string>('CLUB_INVITES_PER_MONTH'),
      DEFAULT_INVITES_PER_MONTH_FALLBACK,
    );
    if (currentUsage >= limit) {
      throw new ForbiddenException({
        type: 'forbidden',
        detail: `Monthly invite limit reached (${limit})`,
        variableKey: INVITE_MONTHLY_LIMIT_KEY,
        limit,
        currentUsage,
      });
    }
  }
}
