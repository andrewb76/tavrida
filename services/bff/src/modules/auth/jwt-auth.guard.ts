import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { Request } from 'express';
import type { AuthUser } from './current-user.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

  constructor(private readonly config: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException({ type: 'unauthorized', detail: 'Missing Bearer token' });
    }

    const token = header.slice('Bearer '.length).trim();
    const user = await this.verifyToken(token);
    request.user = user;
    return true;
  }

  private async verifyToken(token: string): Promise<AuthUser> {
    const jwksUrl = this.config.get<string>('LOGTO_JWKS_URL');
    const audience = this.config.get<string>('LOGTO_AUDIENCE');
    const endpoint = this.config.get<string>('LOGTO_ENDPOINT');

    if (!jwksUrl || jwksUrl.includes('example.com')) {
      return this.verifyDevToken(token);
    }

    if (!this.jwks) {
      this.jwks = createRemoteJWKSet(new URL(jwksUrl));
    }

    const verifyOptions: Parameters<typeof jwtVerify>[2] = {};
    if (audience) verifyOptions.audience = audience;
    if (endpoint) verifyOptions.issuer = `${endpoint.replace(/\/$/, '')}/oidc`;

    try {
      return this.payloadToUser(await jwtVerify(token, this.jwks, verifyOptions));
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;

      const isDev = this.config.get<string>('NODE_ENV') !== 'production';
      if (isDev && audience && verifyOptions.issuer) {
        try {
          return this.payloadToUser(
            await jwtVerify(token, this.jwks, { issuer: verifyOptions.issuer }),
          );
        } catch {
          /* fall through to error below */
        }
      }

      throw new UnauthorizedException({
        type: 'unauthorized',
        detail:
          'Invalid or expired access token. Ensure VITE_LOGTO_API_RESOURCE matches LOGTO_AUDIENCE.',
      });
    }
  }

  private payloadToUser(result: Awaited<ReturnType<typeof jwtVerify>>): AuthUser {
    const sub = result.payload.sub;
    if (typeof sub !== 'string') {
      throw new UnauthorizedException({ type: 'unauthorized', detail: 'Invalid token subject' });
    }
    return { sub };
  }

  /** Local dev when JWKS is not configured: `Bearer dev-{uuid}`. */
  private verifyDevToken(token: string): AuthUser {
    if (token.startsWith('dev-') && token.length > 4) {
      return { sub: token.slice(4) };
    }

    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as {
          sub?: string;
        };
        if (payload.sub) return { sub: payload.sub };
      }
    } catch {
      /* fall through */
    }

    throw new UnauthorizedException({
      type: 'unauthorized',
      detail:
        'Invalid dev token. Use Bearer dev-{uuid}, or configure LOGTO_JWKS_URL and API resource token.',
    });
  }
}
