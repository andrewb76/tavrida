import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { Request } from 'express';
import { ActAsService, ACT_AS_HEADER } from './act-as.service';
import { resolveAuthMode } from './auth-config';
import type { AuthUser } from './current-user.decorator';
import { UserProfileClient } from '../user-profile/user-profile.client';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly actAs: ActAsService,
    private readonly profiles: UserProfileClient,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException({ type: 'unauthorized', detail: 'Missing Bearer token' });
    }

    const token = header.slice('Bearer '.length).trim();
    const actor = await this.verifyAccessToken(token);
    await this.assertNotHardLocked(actor.sub);
    request.user = await this.actAs.apply(actor, request.headers[ACT_AS_HEADER]);
    return true;
  }

  /** Public for WebSocket handshake (`?token=`). Does not apply Act-As. */
  async verifyAccessToken(token: string): Promise<AuthUser> {
    const jwksUrl = this.config.get<string>('LOGTO_JWKS_URL');
    const audience = this.config.get<string>('LOGTO_AUDIENCE');
    const endpoint = this.config.get<string>('LOGTO_ENDPOINT');

    const mode = resolveAuthMode({
      NODE_ENV: this.config.get<string>('NODE_ENV'),
      BFF_ALLOW_DEV_TOKENS: this.config.get<string>('BFF_ALLOW_DEV_TOKENS'),
      LOGTO_ENDPOINT: endpoint,
      LOGTO_JWKS_URL: jwksUrl,
      LOGTO_AUDIENCE: audience,
    });
    if (mode === 'dev-token') {
      return this.verifyDevToken(token);
    }

    if (!this.jwks) {
      this.jwks = createRemoteJWKSet(new URL(jwksUrl!));
    }

    const verifyOptions: Parameters<typeof jwtVerify>[2] = {
      audience: audience!,
      issuer: `${endpoint!.replace(/\/$/, '')}/oidc`,
    };

    try {
      return this.payloadToUser(await jwtVerify(token, this.jwks, verifyOptions));
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;

      const reason = joseFailureReason(error);
      throw new UnauthorizedException({
        type: 'unauthorized',
        detail: reason,
      });
    }
  }

  /** Used by WS after `verifyAccessToken`. Fail-open if user-profile is down. */
  async assertNotHardLocked(userId: string): Promise<void> {
    try {
      const status = await this.profiles.isHardLocked(userId);
      if (status.isHardLocked) {
        throw new ForbiddenException({
          type: 'hard_locked',
          detail: 'Аккаунт заблокирован администратором',
        });
      }
    } catch (error) {
      if (error instanceof ForbiddenException) throw error;
      /* upstream unavailable — do not lock everyone out */
    }
  }

  private payloadToUser(result: Awaited<ReturnType<typeof jwtVerify>>): AuthUser {
    const sub = result.payload.sub;
    if (typeof sub !== 'string') {
      throw new UnauthorizedException({ type: 'unauthorized', detail: 'Invalid token subject' });
    }
    return { sub };
  }

  /** Explicit local-only fallback when BFF_ALLOW_DEV_TOKENS=true. */
  private verifyDevToken(token: string): AuthUser {
    if (token.startsWith('dev-') && token.length > 4) {
      return { sub: token.slice(4) };
    }

    throw new UnauthorizedException({
      type: 'unauthorized',
      detail:
        'Invalid dev token. Use Bearer dev-{userId}, or configure Logto JWT validation.',
    });
  }
}

function joseFailureReason(error: unknown): string {
  const code =
    error && typeof error === 'object' && 'code' in error
      ? String((error as { code: unknown }).code)
      : '';
  const message = error instanceof Error ? error.message : '';

  if (code === 'ERR_JWT_EXPIRED' || /"exp"|"exp" claim timestamp check failed|jwt expired/i.test(message)) {
    return 'Access token expired — sign in again.';
  }
  if (
    code === 'ERR_JWT_CLAIM_VALIDATION_FAILED' ||
    /unexpected "aud"|audience|"aud"/i.test(message)
  ) {
    return (
      'Access token audience mismatch. VITE_LOGTO_API_RESOURCE must equal LOGTO_AUDIENCE, ' +
      'and the SPA must request that API resource (re-login after changing Logto config).'
    );
  }
  return (
    'Invalid access token. Ensure VITE_LOGTO_API_RESOURCE matches LOGTO_AUDIENCE ' +
    'and the token is an API-resource access token (not an ID token).'
  );
}
