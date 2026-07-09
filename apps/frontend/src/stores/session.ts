import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { isLogtoConfigured } from '@/config/logto';

type AccessTokenGetter = () => Promise<string | undefined>;

export const useSessionStore = defineStore('session', () => {
  const logtoEnabled = isLogtoConfigured();

  const isAuthenticated = ref(false);
  const isLoading = ref(false);
  const userId = ref<string | undefined>();
  const displayName = ref('Участник');
  const balance = ref(1250);

  /** Dev-only when Logto env is missing */
  const devAuthenticated = ref(false);

  let accessTokenGetter: AccessTokenGetter | null = null;

  /** Logto JWT = club member (ADR-012). Dev mock: devAuthenticated. */
  const isMember = computed(() => {
    if (logtoEnabled) return isAuthenticated.value;
    return devAuthenticated.value;
  });

  function setAccessTokenGetter(getter: AccessTokenGetter | null) {
    accessTokenGetter = getter;
  }

  async function getAccessToken(): Promise<string | undefined> {
    if (!accessTokenGetter) return undefined;
    return accessTokenGetter();
  }

  function setAuthState(auth: boolean, loading: boolean) {
    isAuthenticated.value = auth;
    isLoading.value = loading;
  }

  function setProfile(sub?: string, name?: string) {
    userId.value = sub;
    if (name) displayName.value = name;
  }

  function clearProfile() {
    userId.value = undefined;
    displayName.value = 'Участник';
  }

  function signInDev() {
    devAuthenticated.value = true;
    isAuthenticated.value = true;
  }

  function signOutDev() {
    devAuthenticated.value = false;
    isAuthenticated.value = false;
  }

  return {
    isAuthenticated,
    isLoading,
    isMember,
    userId,
    displayName,
    balance,
    logtoEnabled,
    setAccessTokenGetter,
    getAccessToken,
    setAuthState,
    setProfile,
    clearProfile,
    signInDev,
    signOutDev,
  };
});
