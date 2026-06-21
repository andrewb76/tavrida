// apps/config-service/src/common/guards/admin-role.guard.ts
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

@Injectable()
export class AdminRoleGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    // Здесь предполагается, что в req.user после аутентификации хранятся роли
    const user = (req as any).user as any;
    if (!user) throw new UnauthorizedException('Not authenticated');
    const roles = user.roles || [];
    if (!roles.includes('admin') && !roles.includes('moderator')) {
      throw new UnauthorizedException('Insufficient role');
    }
    return true;
  }
}
