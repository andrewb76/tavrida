import { useSessionStore } from '@/stores/session';

const DEFAULT_DETAIL = 'Аккаунт заблокирован администратором';

/** Parse BFF `403` body — top-level or Nest `{ message: { type } }` shape. */
export function readHardLockedDetail(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null;
  const root = body as Record<string, unknown>;

  if (root.type === 'hard_locked') {
    return typeof root.detail === 'string' && root.detail.trim()
      ? root.detail
      : DEFAULT_DETAIL;
  }

  const message = root.message;
  if (message && typeof message === 'object' && !Array.isArray(message)) {
    const nested = message as Record<string, unknown>;
    if (nested.type === 'hard_locked') {
      return typeof nested.detail === 'string' && nested.detail.trim()
        ? nested.detail
        : DEFAULT_DETAIL;
    }
  }

  return null;
}

/** Mark JWT actor as hard-locked. Router guard / watch send them to `/account-locked`. */
export function markActorHardLocked(): void {
  const session = useSessionStore();
  session.setHardLocked(true);
  session.setPlatformRoles([]);
  session.setHardLockResolved(true);
}

/** If response is hard-lock 403, apply SPA flag. Returns true when locked. */
export function applyHardLockFromResponse(status: number, body: unknown): boolean {
  if (status !== 403) return false;
  if (!readHardLockedDetail(body)) return false;
  markActorHardLocked();
  return true;
}
