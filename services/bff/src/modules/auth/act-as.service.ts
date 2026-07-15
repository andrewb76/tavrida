import {
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KetoService } from '../keto/keto.service';
import type { AuthUser } from './current-user.decorator';

export const ACT_AS_HEADER = 'x-act-as';

@Injectable()
export class ActAsService {
  private readonly logger = new Logger(ActAsService.name);

  constructor(
    private readonly keto: KetoService,
    private readonly config: ConfigService,
  ) {}

  /**
   * If `X-Act-As` is set, require JWT subject to be platform admin and swap effective `sub`.
   * Target admins are rejected.
   */
  async apply(actor: AuthUser, headerValue: string | string[] | undefined): Promise<AuthUser> {
    const raw = Array.isArray(headerValue) ? headerValue[0] : headerValue;
    const target = typeof raw === 'string' ? raw.trim() : '';
    if (!target || target === actor.sub) {
      return actor;
    }

    if (!(await this.isActorAdmin(actor.sub))) {
      throw new ForbiddenException({
        type: 'forbidden',
        detail: 'X-Act-As requires platform admin',
      });
    }

    if (await this.keto.isPlatformAdmin(target)) {
      throw new ForbiddenException({
        type: 'forbidden',
        detail: 'Cannot impersonate an admin user',
      });
    }

    this.logger.log(`act-as actor=${actor.sub} target=${target}`);
    return { sub: target, actorSub: actor.sub };
  }

  private async isActorAdmin(userId: string): Promise<boolean> {
    if (await this.keto.isPlatformAdmin(userId)) return true;
    const unlimited = (this.config.get<string>('CLUB_INVITES_UNLIMITED_ISSUER_IDS') ?? '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);
    return unlimited.includes(userId);
  }
}
