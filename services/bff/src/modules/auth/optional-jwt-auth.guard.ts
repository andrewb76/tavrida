import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { AuthUser } from './current-user.decorator';

/** Attaches `request.user` when Bearer is valid; never rejects anonymous. */
@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtAuthGuard) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) return true;
    try {
      await this.jwt.canActivate(context);
    } catch {
      /* anonymous */
    }
    return true;
  }
}
