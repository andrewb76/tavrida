import { createHmac, timingSafeEqual } from 'node:crypto';

export function verifyLogtoWebhookSignature(
  signingKey: string,
  rawBody: Buffer,
  expectedSignature: string | undefined,
): boolean {
  if (!expectedSignature?.trim()) return false;

  const hmac = createHmac('sha256', signingKey);
  hmac.update(rawBody);
  const computed = hmac.digest('hex');

  const expectedBuffer = Buffer.from(expectedSignature, 'hex');
  const computedBuffer = Buffer.from(computed, 'hex');
  if (expectedBuffer.length !== computedBuffer.length) return false;

  return timingSafeEqual(expectedBuffer, computedBuffer);
}

export type LogtoUserEntity = {
  id: string;
  username?: string | null;
  primaryEmail?: string | null;
  primaryPhone?: string | null;
  name?: string | null;
  avatar?: string | null;
  isSuspended?: boolean;
};

export type LogtoWebhookPayload = {
  hookId?: string;
  event: string;
  createdAt?: string;
  data?: LogtoUserEntity | null;
  user?: LogtoUserEntity;
  userId?: string;
  params?: { userId?: string };
};

export function extractLogtoUser(payload: LogtoWebhookPayload): LogtoUserEntity | null {
  if (payload.data) return payload.data;
  if (payload.user) return payload.user;
  return null;
}

export function extractLogtoUserId(payload: LogtoWebhookPayload): string | null {
  const user = extractLogtoUser(payload);
  if (user?.id) return user.id;
  if (payload.userId) return payload.userId;
  if (payload.params?.userId) return payload.params.userId;
  return null;
}
