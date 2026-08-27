import { usePresenceStore } from '@/stores/presence';
import { useSessionStore } from '@/stores/session';
import { watch } from 'vue';

/**
 * Starts presence heartbeat when authenticated, stops on logout.
 * Mirrors the pattern of useAuthSync / useRolesSync composables.
 */
export function usePresenceSync() {
  const session = useSessionStore();
  const presence = usePresenceStore();

  watch(
    () => session.isAuthenticated,
    (authed) => {
      if (authed) {
        presence.startHeartbeat();
      } else {
        presence.stopHeartbeat();
      }
    },
    { immediate: true },
  );
}
