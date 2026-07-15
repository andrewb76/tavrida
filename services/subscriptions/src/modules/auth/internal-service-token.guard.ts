import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

/**
 * Optional shared secret for `/internal/v1/*`.
 * When `INTERNAL_SERVICE_TOKEN` is unset/empty — allow (local/dev).
 * When set — require `Authorization: Bearer <token>`.
 */
@Injectable()
export class InternalServiceTokenGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.config.get<string>('INTERNAL_SERVICE_TOKEN')?.trim();
    if (!expected) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException({
        type: 'unauthorized',
        detail: 'Missing internal service token',
      });
    }
    const token = header.slice('Bearer '.length).trim();
    if (token !== expected) {
      throw new UnauthorizedException({
        type: 'unauthorized',
        detail: 'Invalid internal service token',
      });
    }
    return true;
  }
}
