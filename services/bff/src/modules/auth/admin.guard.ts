import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import type { AuthUser } from '../auth/current-user.decorator';
import { KetoService } from '../keto/keto.service';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private readonly keto: KetoService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const user = request.user;
    if (!user?.sub) {
      throw new UnauthorizedException({ type: 'unauthorized', detail: 'Authentication required' });
    }

    if (await this.keto.isPlatformAdmin(user.sub)) return true;

    const unlimited = (this.config.get<string>('CLUB_INVITES_UNLIMITED_ISSUER_IDS') ?? '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);
    if (unlimited.includes(user.sub)) return true;

    throw new ForbiddenException({ type: 'forbidden', detail: 'Admin role required' });
  }
}
