import { inspectBffAuthFailure } from '@/services/bffErrors';
import {
  forceSessionReauth,
  sessionExpiredError,
} from '@/services/sessionReauth';
import { useSessionStore } from '@/stores/session';

/** BFF impersonation header (ADR-018). Express lowercases incoming names. */
export const ACT_AS_HEADER = 'X-Act-As';

function apiBase(): string {
  return import.meta.env.VITE_API_BASE_URL ?? '/api/v1';
}

export async function optionalBearerToken(): Promise<string | undefined> {
  const session = useSessionStore();
  return session.getAccessToken();
}

/** Bearer token for BFF — fails fast with a user-facing message. */
export async function requireBearerToken(): Promise<string> {
  const session = useSessionStore();
  let token: string | undefined;
  try {
    token = await session.getAccessToken();
  } catch {
    if (session.logtoEnabled) {
      void forceSessionReauth();
      throw sessionExpiredError();
    }
    throw new Error('Войдите в аккаунт');
  }

  if (token) return token;

  if (session.logtoEnabled) {
    void forceSessionReauth();
    throw sessionExpiredError();
  }

  throw new Error('Войдите в аккаунт');
}

function mergeHeaders(
  base: Record<string, string>,
  init?: HeadersInit,
): Record<string, string> {
  if (!init) return base;
  const out = { ...base };
  if (init instanceof Headers) {
    init.forEach((value, key) => {
      out[key] = value;
    });
  } else if (Array.isArray(init)) {
    for (const [key, value] of init) out[key] = value;
  } else {
    Object.assign(out, init);
  }
  return out;
}

/**
 * Auth headers for BFF calls. Adds `X-Act-As` when admin is impersonating.
 * Use `skipActAs` for the rare call that must run as the real admin while a banner is active
 * (not needed for start — start clears first / only from admin without act-as).
 */
export async function bffAuthHeaders(
  init?: HeadersInit,
  options?: { json?: boolean; skipActAs?: boolean; optional?: boolean },
): Promise<Record<string, string>> {
  const session = useSessionStore();
  const token = options?.optional
    ? await optionalBearerToken()
    : await requireBearerToken();

  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options?.json !== false) headers['Content-Type'] = 'application/json';
  if (!options?.skipActAs && session.actAsUserId) {
    headers[ACT_AS_HEADER] = session.actAsUserId;
  }
  return mergeHeaders(headers, init);
}

export type BffFetchOptions = {
  json?: boolean;
  skipActAs?: boolean;
  optional?: boolean;
};

/**
 * Authenticated fetch to BFF. On 401 stale/invalid access token → logout + relogin.
 * On 403 hard_locked → SPA trap flag (same as before).
 */
export async function bffFetch(
  path: string,
  init?: RequestInit,
  options?: BffFetchOptions,
): Promise<Response> {
  const url = path.startsWith('http') ? path : `${apiBase()}${path}`;
  const headers = await bffAuthHeaders(init?.headers, options);
  const res = await fetch(url, { ...init, headers });
  if (!res.ok) {
    const body = await res.clone().json().catch(() => null);
    inspectBffAuthFailure(res.status, body);
  }
  return res;
}
