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
    if (header?.startsWith('Bearer ')) {
      try {
        await this.jwt.canActivate(context);
      } catch {
        /* leave request anonymous */
      }
    }
    // Optional auth: never deny. Always allow whether JWT attached or not.
    return true; // NOSONAR typescript:S3516 — CanActivate contract for optional JWT
  }
}
