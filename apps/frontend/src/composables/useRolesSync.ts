import { watch } from 'vue';
import { useLogto } from '@logto/vue';
import { isLogtoConfigured } from '@/config/logto';
import { refreshPlatformRoles } from '@/services/roles';
import { useSessionStore } from '@/stores/session';

/** Fetch Keto platform roles after Logto auth. Mount once in App.vue. */
export function useRolesSync() {
  if (!isLogtoConfigured()) return;

  const session = useSessionStore();
  const logto = useLogto();

    watch(
    () => logto.isAuthenticated.value,
    (authenticated) => {
      if (authenticated && !logto.isLoading.value) {
        void refreshPlatformRoles();
      } else if (!authenticated) {
        session.setPlatformRoles([]);
      }
    },
    { immediate: true },
  );

  watch(
    () => logto.isLoading.value,
    (loading) => {
      if (!loading && logto.isAuthenticated.value) {
        void refreshPlatformRoles();
      }
    },
  );
}
