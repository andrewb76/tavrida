/** Pure helpers for BFF 401 stale-token detection (no Vue / Pinia). */

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

/** Nest may put `{ type, detail }` at top level or under `message`. */
export function readUnauthorizedPayload(body: unknown): {
  type: string | null;
  detail: string | null;
} {
  const root = asRecord(body);
  if (!root) return { type: null, detail: null };

  const from = (obj: Record<string, unknown>) => ({
    type: typeof obj.type === 'string' ? obj.type : null,
    detail: typeof obj.detail === 'string' ? obj.detail : null,
  });

  if (root.type === 'unauthorized' || typeof root.detail === 'string') {
    const top = from(root);
    if (top.type === 'unauthorized' || top.detail) return top;
  }

  const message = root.message;
  if (typeof message === 'string') {
    return { type: 'unauthorized', detail: message };
  }
  const nested = asRecord(message);
  if (nested) return from(nested);

  return { type: null, detail: null };
}

/**
 * BFF JWT failures that mean the SPA session must be cleared and the user
 * sent through Logto login again (expired / wrong aud / ID token as Bearer).
 */
export function isStaleAccessTokenUnauthorized(status: number, body: unknown): boolean {
  if (status !== 401) return false;
  const { type, detail } = readUnauthorizedPayload(body);
  if (type && type !== 'unauthorized') return false;
  if (!detail) return false;
  return /access token expired|audience mismatch|invalid access token|VITE_LOGTO_API_RESOURCE|not an ID token|sign in again|API-resource access token/i.test(
    detail,
  );
}
