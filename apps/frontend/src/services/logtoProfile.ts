import type { useLogto } from '@logto/vue';
import type { useSessionStore } from '@/stores/session';
import { bffAuthHeaders } from './apiAuth';

type LogtoClient = ReturnType<typeof useLogto>;
type SessionStore = ReturnType<typeof useSessionStore>;

type LogtoClaims = {
  sub?: string;
  name?: string;
  username?: string;
  email?: string;
  picture?: string;
  avatar?: string;
};

type LogtoUserInfo = {
  name?: string;
  username?: string;
  email?: string;
  picture?: string;
  avatar?: string;
};

function apiBase(): string {
  return import.meta.env.VITE_API_BASE_URL ?? '/api/v1';
}

function pickAvatarUrl(...sources: Array<string | undefined | null>): string | undefined {
  for (const value of sources) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return undefined;
}

/** Persist Logto identity into user-profile (forum / admin enrich cache). */
async function pushIdentityToProfile(input: {
  name?: string;
  username?: string;
  email?: string;
  avatarUrl?: string;
}): Promise<void> {
  try {
    await fetch(`${apiBase()}/me/identity`, {
      method: 'POST',
      headers: await bffAuthHeaders(),
      body: JSON.stringify(input),
    });
  } catch {
    /* profile cache sync is best-effort; session still works */
  }
}

/** Sync Logto user claims → Pinia session (name, email, avatar) + user-profile cache. */
export async function syncLogtoProfile(logto: LogtoClient, session: SessionStore): Promise<void> {
  if (!logto.isAuthenticated.value) return;

  const claims = (await logto.getIdTokenClaims()) as LogtoClaims | undefined;
  const userInfo = (await logto.fetchUserInfo()) as LogtoUserInfo | undefined;

  const name =
    userInfo?.name ??
    userInfo?.username ??
    claims?.name ??
    claims?.username ??
    undefined;
  const username = userInfo?.username ?? claims?.username ?? undefined;
  const email = userInfo?.email ?? claims?.email ?? undefined;
  const avatarUrl = pickAvatarUrl(
    userInfo?.picture,
    userInfo?.avatar,
    claims?.picture,
    claims?.avatar,
  );

  session.setProfile({
    sub: claims?.sub ?? undefined,
    name,
    email,
    avatarUrl,
  });

  await pushIdentityToProfile({ name, username, email, avatarUrl });
}
