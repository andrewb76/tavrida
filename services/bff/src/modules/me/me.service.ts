import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KetoService, type PlatformRole } from '../keto/keto.service';
import { UserProfileClient } from '../user-profile/user-profile.client';

export type IdentitySyncInput = {
  name?: string | null;
  username?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
};

@Injectable()
export class MeService {
  constructor(
    private readonly keto: KetoService,
    private readonly config: ConfigService,
    private readonly profiles: UserProfileClient,
  ) {}

  async getRoles(userId: string): Promise<{ roles: PlatformRole[] }> {
    const roles = await this.keto.getPlatformRoles(userId);

    if (!roles.includes('admin') && this.isBootstrapAdmin(userId)) {
      const withAdmin: PlatformRole[] = [...roles, 'admin'];
      return { roles: withAdmin };
    }

    return { roles };
  }

  /**
   * Push Logto identity (client claims/userinfo) into user-profile cache.
   * Needed for forum/admin enrich when Logto webhooks were never received.
   */
  async syncIdentity(userId: string, input: IdentitySyncInput) {
    const name = input.name?.trim() || null;
    const username = input.username?.trim() || null;
    const email = input.email?.trim() || null;
    const avatar = input.avatarUrl?.trim() || null;

    await this.profiles.syncFromLogto({
      userId,
      name,
      username,
      primaryEmail: email,
      avatar,
    });

    return {
      userId,
      synced: true,
      displayName: name || username,
      avatarUrl: avatar,
    };
  }

  /** Env fallback when Keto is not configured (local bootstrap). */
  private isBootstrapAdmin(userId: string): boolean {
    const unlimited = (this.config.get<string>('CLUB_INVITES_UNLIMITED_ISSUER_IDS') ?? '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);
    return unlimited.includes(userId);
  }
}
