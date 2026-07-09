import { useLogto } from '@logto/vue';
import { watch } from 'vue';
import { isLogtoConfigured, logtoApiResource } from '@/config/logto';
import { useSessionStore } from '@/stores/session';

/** Sync Logto → Pinia session + register API token getter. Mount once in App.vue. */
export function useAuthSync() {
  if (!isLogtoConfigured()) return;

  const session = useSessionStore();
  const logto = useLogto();
  const resource = logtoApiResource();

  session.setAccessTokenGetter(async () => {
    if (!logto.isAuthenticated.value) return undefined;
    try {
      return resource ? await logto.getAccessToken(resource) : await logto.getAccessToken();
    } catch {
      return undefined;
    }
  });

  watch(
    () => logto.isLoading.value,
    (loading) => {
      session.setAuthState(logto.isAuthenticated.value, loading);
    },
    { immediate: true },
  );

  watch(
    () => logto.isAuthenticated.value,
    async (authenticated) => {
      session.setAuthState(authenticated, logto.isLoading.value);
      if (authenticated) {
        const claims = await logto.getIdTokenClaims();
        const name = claims?.name ?? claims?.username ?? undefined;
        session.setProfile(claims?.sub ?? undefined, name ?? undefined);
      } else {
        session.clearProfile();
      }
    },
    { immediate: true },
  );
}
