import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { verifyInternalServiceToken } from '@tavrida/internal-auth';
import type { Request } from 'express';

/**
 * Controller-level defense in depth; global path middleware protects all
 * current and future `/internal/v1/*` routes.
 */
@Injectable()
export class InternalServiceTokenGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const result = verifyInternalServiceToken(request.headers.authorization, {
      NODE_ENV: this.config.get<string>('NODE_ENV'),
      INTERNAL_SERVICE_TOKEN: this.config.get<string>('INTERNAL_SERVICE_TOKEN'),
    });
    if (!result.ok) {
      throw new UnauthorizedException({
        type: 'unauthorized',
        detail: result.detail,
      });
    }
    return true;
  }
}
