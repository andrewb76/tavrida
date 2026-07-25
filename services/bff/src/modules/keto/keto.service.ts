import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  buildPlatformTuple,
  buildPlatformTupleQuery,
  type PlatformRelation,
} from './keto-platform';

const DEFAULT_NAMESPACE = 'TavridaLot';
const DEFAULT_PLATFORM_OBJECT = 'platform:tavrida-lot';

export type PlatformRole = 'member' | 'admin' | 'moderator' | 'expert';

const PLATFORM_RELATIONS: PlatformRelation[] = ['admin', 'moderator', 'expert'];

@Injectable()
export class KetoService {
  private readonly logger = new Logger(KetoService.name);

  constructor(private readonly config: ConfigService) {}

  async isPlatformAdmin(userId: string): Promise<boolean> {
    return this.hasPlatformRelation(userId, 'admin');
  }

  /** Platform admin or platform moderator (forum staff). Bootstrap env counts as admin. */
  async isForumStaff(userId: string): Promise<boolean> {
    if (await this.isPlatformAdmin(userId)) return true;
    if (await this.hasPlatformRelation(userId, 'moderator')) return true;
    const unlimited = (this.config.get<string>('CLUB_INVITES_UNLIMITED_ISSUER_IDS') ?? '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);
    return unlimited.includes(userId);
  }

  async getPlatformRoles(userId: string): Promise<PlatformRole[]> {
    const roles: PlatformRole[] = ['member'];

    for (const relation of PLATFORM_RELATIONS) {
      if (await this.hasPlatformRelation(userId, relation)) {
        roles.push(relation);
      }
    }

    return roles;
  }

  async grantPlatformRole(userId: string, relation: PlatformRelation): Promise<void> {
    const writeUrl = this.requireWriteUrl();
    const body = buildPlatformTuple(this.tupleConfig(), userId, relation);

    const response = await fetch(`${writeUrl}/admin/relation-tuples`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new ServiceUnavailableException({
        type: 'keto_write_failed',
        detail: `Failed to grant ${relation}: ${response.status} ${response.statusText}`,
      });
    }
  }

  async revokePlatformRole(userId: string, relation: PlatformRelation): Promise<void> {
    const writeUrl = this.requireWriteUrl();
    const params = buildPlatformTupleQuery(this.tupleConfig(), userId, relation);

    const response = await fetch(`${writeUrl}/admin/relation-tuples?${params}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new ServiceUnavailableException({
        type: 'keto_write_failed',
        detail: `Failed to revoke ${relation}: ${response.status} ${response.statusText}`,
      });
    }
  }

  private tupleConfig() {
    return {
      namespace: this.config.get<string>('KETO_NAMESPACE') ?? DEFAULT_NAMESPACE,
      object: this.config.get<string>('KETO_PLATFORM_OBJECT') ?? DEFAULT_PLATFORM_OBJECT,
    };
  }

  private requireWriteUrl(): string {
    const writeUrl = this.config.get<string>('KETO_WRITE_URL')?.replace(/\/$/, '');
    if (!writeUrl) {
      throw new ServiceUnavailableException({
        type: 'keto_not_configured',
        detail: 'KETO_WRITE_URL is not configured',
      });
    }
    return writeUrl;
  }

  private async hasPlatformRelation(userId: string, relation: PlatformRelation): Promise<boolean> {
    const readUrl = this.config.get<string>('KETO_READ_URL')?.replace(/\/$/, '');
    if (!readUrl) return false;

    const params = buildPlatformTupleQuery(this.tupleConfig(), userId, relation);

    try {
      const response = await fetch(`${readUrl}/relation-tuples/check?${params}`);
      if (!response.ok) {
        this.logger.warn(`Keto check failed: ${response.status} ${response.statusText}`);
        return false;
      }
      const body = (await response.json()) as { allowed?: boolean };
      return body.allowed === true;
    } catch (error) {
      this.logger.warn(`Keto unreachable at ${readUrl}: ${(error as Error).message}`);
      return false;
    }
  }
}
