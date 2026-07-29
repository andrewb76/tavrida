import { setPostAuthRedirect } from '@/services/authRedirect';
import {
  isStaleAccessTokenUnauthorized,
  readUnauthorizedPayload,
} from '@/services/sessionReauth.logic';
import { useSessionStore } from '@/stores/session';

export {
  isStaleAccessTokenUnauthorized,
  readUnauthorizedPayload,
} from '@/services/sessionReauth.logic';

const DEFAULT_DETAIL = 'Сессия истекла — войдите снова';

type ReauthHandler = () => Promise<void>;

let reauthHandler: ReauthHandler | null = null;
let reauthInflight: Promise<void> | null = null;

/** Register from `useAuthSync` — Logto signOut → `/auth/relogin`. */
export function setSessionReauthHandler(handler: ReauthHandler | null): void {
  reauthHandler = handler;
}

/** Side effect: start logout → relogin. Returns true when triggered. */
export function applyUnauthorizedReauthFromResponse(status: number, body: unknown): boolean {
  if (!isStaleAccessTokenUnauthorized(status, body)) return false;
  void forceSessionReauth();
  return true;
}

export async function forceSessionReauth(options?: { returnTo?: string }): Promise<void> {
  if (reauthInflight) return reauthInflight;
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/auth/relogin')) {
    return;
  }

  reauthInflight = (async () => {
    const session = useSessionStore();
    const here = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    const returnTo = options?.returnTo ?? here;
    if (
      returnTo &&
      !returnTo.startsWith('/auth/') &&
      !returnTo.startsWith('/callback')
    ) {
      setPostAuthRedirect(returnTo);
    }

    session.stopImpersonation();
    session.clearProfile();
    session.setPlatformRoles([]);
    session.setBalance(0);
    session.setAuthState(false, false);

    try {
      const { useSubscriptionsStore } = await import('@/stores/subscriptions');
      useSubscriptionsStore().invalidate();
    } catch {
      /* store may be unavailable in early boot */
    }

    if (reauthHandler) {
      await reauthHandler();
      return;
    }

    window.location.assign(`${window.location.origin}/auth/relogin`);
  })().finally(() => {
    reauthInflight = null;
  });

  return reauthInflight;
}

export function sessionExpiredError(detail = DEFAULT_DETAIL): Error {
  return Object.assign(new Error(detail), { code: 'session_expired' as const });
}
