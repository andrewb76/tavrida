import { createHash, timingSafeEqual } from 'node:crypto';

export type InternalAuthEnvironment = {
  NODE_ENV?: string;
  INTERNAL_SERVICE_TOKEN?: string;
};

export type InternalAuthResult =
  | { ok: true }
  | { ok: false; detail: 'Missing internal service token' | 'Invalid internal service token' };

function digest(value: string): Buffer {
  return createHash('sha256').update(value).digest();
}

export function assertInternalAuthConfigured(env: InternalAuthEnvironment): void {
  if (env.NODE_ENV === 'production' && !env.INTERNAL_SERVICE_TOKEN?.trim()) {
    throw new Error('INTERNAL_SERVICE_TOKEN is required in production');
  }
}

export function verifyInternalServiceToken(
  authorization: string | undefined,
  env: InternalAuthEnvironment,
): InternalAuthResult {
  const expected = env.INTERNAL_SERVICE_TOKEN?.trim();
  if (!expected && env.NODE_ENV !== 'production') return { ok: true };

  if (!authorization?.startsWith('Bearer ')) {
    return { ok: false, detail: 'Missing internal service token' };
  }
  const supplied = authorization.slice('Bearer '.length).trim();
  if (!expected || !timingSafeEqual(digest(supplied), digest(expected))) {
    return { ok: false, detail: 'Invalid internal service token' };
  }
  return { ok: true };
}

export function internalServiceHeaders(
  token: string | undefined,
  headers: Record<string, string> = {},
): Record<string, string> {
  const normalized = token?.trim();
  return normalized ? { ...headers, Authorization: `Bearer ${normalized}` } : { ...headers };
}

type RequestLike = {
  originalUrl?: string;
  url?: string;
  headers: { authorization?: string };
};

type ResponseLike = {
  status(code: number): ResponseLike;
  json(body: unknown): unknown;
};

type Next = () => void;

export function createInternalAuthMiddleware(env: InternalAuthEnvironment) {
  assertInternalAuthConfigured(env);
  return (request: RequestLike, response: ResponseLike, next: Next): unknown => {
    const path = request.originalUrl ?? request.url ?? '';
    if (!path.startsWith('/internal/v1/')) {
      next();
      return;
    }

    const result = verifyInternalServiceToken(request.headers.authorization, env);
    if (result.ok) {
      next();
      return;
    }
    return response.status(401).json({ type: 'unauthorized', detail: result.detail });
  };
}
