import { useLogto } from '@logto/vue';
import { watch } from 'vue';
import { isLogtoConfigured, logtoApiResource } from '@/config/logto';
import { syncLogtoProfile } from '@/services/logtoProfile';
import { resolveBearerToken } from '@/services/logtoToken';
import { useSessionStore } from '@/stores/session';

/** Sync Logto → Pinia session + register API token getter. Mount once in App.vue. */
export function useAuthSync() {
  if (!isLogtoConfigured()) return;

  const session = useSessionStore();
  const logto = useLogto();
  const resource = logtoApiResource();

  session.setAccessTokenGetter(() => resolveBearerToken(logto, resource));

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
        await syncLogtoProfile(logto, session);
      } else {
        session.clearProfile();
      }
    },
    { immediate: true },
  );
}
