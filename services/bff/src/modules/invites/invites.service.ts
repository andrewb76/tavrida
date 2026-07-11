import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'node:crypto';
import { KetoService } from '../keto/keto.service';
import { LogtoManagementService } from '../logto/logto-management.service';
import { ClubSettingsReader } from '../scalar-config/club-settings.reader';
import { UserProfileClient } from '../user-profile/user-profile.client';

const DEFAULT_INVITES_PER_MONTH = 10;
const LINK_ONLY_EMAIL_DOMAIN = 'invite.tavrida-lot.localhost';

@Injectable()
export class InvitesService {
  constructor(
    private readonly logto: LogtoManagementService,
    private readonly userProfile: UserProfileClient,
    private readonly keto: KetoService,
    private readonly clubSettings: ClubSettingsReader,
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

  private async assertInviteQuota(issuerId: string) {
    if (await this.keto.isPlatformAdmin(issuerId)) return;

    const unlimited = (this.config.get<string>('CLUB_INVITES_UNLIMITED_ISSUER_IDS') ?? '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);
    if (unlimited.includes(issuerId)) return;

    const limit = Number(
      this.config.get<string>('CLUB_INVITES_PER_MONTH') ?? DEFAULT_INVITES_PER_MONTH,
    );
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);

    const invites = await this.userProfile.listInvites(issuerId, 100);
    const createdThisMonth = invites.filter(
      (item) => new Date(item.createdAt) >= monthStart,
    ).length;

    if (createdThisMonth >= limit) {
      throw new ForbiddenException({
        type: 'forbidden',
        detail: `Monthly invite limit reached (${limit})`,
      });
    }
  }
}
