import type { useLogto } from '@logto/vue';
import type { useSessionStore } from '@/stores/session';

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

function pickAvatarUrl(...sources: Array<string | undefined | null>): string | undefined {
  for (const value of sources) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return undefined;
}

/** Sync Logto user claims → Pinia session (name, email, avatar). */
export async function syncLogtoProfile(logto: LogtoClient, session: SessionStore): Promise<void> {
  if (!logto.isAuthenticated.value) return;

  const claims = (await logto.getIdTokenClaims()) as LogtoClaims | undefined;
  const userInfo = (await logto.fetchUserInfo()) as LogtoUserInfo | undefined;

  session.setProfile({
    sub: claims?.sub ?? undefined,
    name:
      userInfo?.name ??
      userInfo?.username ??
      claims?.name ??
      claims?.username ??
      undefined,
    email: userInfo?.email ?? claims?.email ?? undefined,
    avatarUrl: pickAvatarUrl(
      userInfo?.picture,
      userInfo?.avatar,
      claims?.picture,
      claims?.avatar,
    ),
  });
}
