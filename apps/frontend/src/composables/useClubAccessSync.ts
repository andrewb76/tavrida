import { onMounted } from 'vue';
import { fetchPublicClubSettings } from '@/services/publicSettings';
import { useClubAccessStore } from '@/stores/clubAccess';

/** Load club.* public settings from BFF. Mount once in App.vue. */
export function useClubAccessSync() {
  const clubAccess = useClubAccessStore();

  onMounted(() => {
    void fetchPublicClubSettings()
      .then((data) => clubAccess.applyPublicSettings(data))
      .catch(() => {
        clubAccess.applyPublicSettings({ 'club.registration.inviteOnly': true });
      });
  });
}
