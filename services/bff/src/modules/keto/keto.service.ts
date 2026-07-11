import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const DEFAULT_NAMESPACE = 'TavridaLot';
const DEFAULT_PLATFORM_OBJECT = 'platform:tavrida-lot';

export type PlatformRole = 'member' | 'admin' | 'moderator' | 'expert';

const PLATFORM_RELATIONS: Array<Exclude<PlatformRole, 'member'>> = [
  'admin',
  'moderator',
  'expert',
];

@Injectable()
export class KetoService {
  private readonly logger = new Logger(KetoService.name);

  constructor(private readonly config: ConfigService) {}

  async isPlatformAdmin(userId: string): Promise<boolean> {
    return this.hasPlatformRelation(userId, 'admin');
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

  private async hasPlatformRelation(
    userId: string,
    relation: Exclude<PlatformRole, 'member'>,
  ): Promise<boolean> {
    const readUrl = this.config.get<string>('KETO_READ_URL')?.replace(/\/$/, '');
    if (!readUrl) return false;

    const params = new URLSearchParams({
      namespace: this.config.get<string>('KETO_NAMESPACE') ?? DEFAULT_NAMESPACE,
      object: this.config.get<string>('KETO_PLATFORM_OBJECT') ?? DEFAULT_PLATFORM_OBJECT,
      relation,
      subject_id: `user:${userId}`,
    });

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
