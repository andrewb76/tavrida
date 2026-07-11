import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KetoService, type PlatformRole } from '../keto/keto.service';

@Injectable()
export class MeService {
  constructor(
    private readonly keto: KetoService,
    private readonly config: ConfigService,
  ) {}

  async getRoles(userId: string): Promise<{ roles: PlatformRole[] }> {
    const roles = await this.keto.getPlatformRoles(userId);

    if (!roles.includes('admin') && this.isBootstrapAdmin(userId)) {
      const withAdmin: PlatformRole[] = [...roles, 'admin'];
      return { roles: withAdmin };
    }

    return { roles };
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
