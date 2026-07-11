import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { verifyLogtoWebhookSignature } from './logto-webhook.util';

type RequestWithRawBody = Request & { rawBody?: Buffer };

@Injectable()
export class LogtoWebhookGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithRawBody>();
    const signingKey = this.config.get<string>('LOGTO_WEBHOOK_SIGNING_KEY')?.trim();

    if (!signingKey) {
      if (process.env.NODE_ENV === 'production') {
        throw new UnauthorizedException({
          type: 'webhook_not_configured',
          detail: 'LOGTO_WEBHOOK_SIGNING_KEY is required in production',
        });
      }
      return true;
    }

    const rawBody = request.rawBody;
    if (!rawBody) {
      throw new UnauthorizedException({
        type: 'invalid_signature',
        detail: 'Missing raw request body for webhook verification',
      });
    }

    const signature = request.header('logto-signature-sha-256') ?? undefined;
    const valid = verifyLogtoWebhookSignature(signingKey, rawBody, signature);
    if (!valid) {
      throw new UnauthorizedException({
        type: 'invalid_signature',
        detail: 'Logto webhook signature mismatch',
      });
    }

    return true;
  }
}
