import { watch } from 'vue';
import { useLogto } from '@logto/vue';
import { isLogtoConfigured } from '@/config/logto';
import { refreshPlatformRoles } from '@/services/roles';
import { useSessionStore } from '@/stores/session';
import { router } from '@/router';

/** Fetch Keto platform roles after Logto auth. Mount once in App.vue. */
export function useRolesSync() {
  const session = useSessionStore();

  watch(
    () => session.isHardLocked,
    (locked) => {
      if (locked && router.currentRoute.value.name !== 'account-locked') {
        void router.replace({ name: 'account-locked' });
      }
    },
  );

  if (!isLogtoConfigured()) return;

  const logto = useLogto();

  watch(
    () => logto.isAuthenticated.value,
    (authenticated) => {
      if (authenticated && !logto.isLoading.value) {
        void refreshPlatformRoles();
      } else if (!authenticated) {
        session.setPlatformRoles([]);
        session.clearHardLockState();
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
