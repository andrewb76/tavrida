import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { isLogtoConfigured } from '@/config/logto';

export type PlatformRole = 'member' | 'admin' | 'moderator' | 'expert';

type AccessTokenGetter = () => Promise<string | undefined>;

export const useSessionStore = defineStore('session', () => {
  const logtoEnabled = isLogtoConfigured();

  const isAuthenticated = ref(false);
  const isLoading = ref(false);
  const userId = ref<string | undefined>();
  const displayName = ref('Участник');
  const email = ref<string | undefined>();
  const avatarUrl = ref<string | undefined>();
  const balance = ref(1250);
  const platformRoles = ref<PlatformRole[]>([]);
  const rolesLoading = ref(false);

  /** Dev-only when Logto env is missing */
  const devAuthenticated = ref(false);

  let accessTokenGetter: AccessTokenGetter | null = null;

  /** Logto JWT = club member (ADR-012). Dev mock: devAuthenticated. */
  const isMember = computed(() => {
    if (logtoEnabled) return isAuthenticated.value;
    return devAuthenticated.value;
  });

  const isAdmin = computed(() => platformRoles.value.includes('admin'));
  const isModerator = computed(
    () => isAdmin.value || platformRoles.value.includes('moderator'),
  );

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

  function setProfile(profile: {
    sub?: string;
    name?: string;
    email?: string;
    avatarUrl?: string;
  }) {
    userId.value = profile.sub;
    if (profile.name) displayName.value = profile.name;
    email.value = profile.email;
    avatarUrl.value = profile.avatarUrl;
  }

  function clearProfile() {
    userId.value = undefined;
    displayName.value = 'Участник';
    email.value = undefined;
    avatarUrl.value = undefined;
  }

  function setPlatformRoles(roles: PlatformRole[]) {
    platformRoles.value = roles;
  }

  function setRolesLoading(loading: boolean) {
    rolesLoading.value = loading;
  }

  function signInDev() {
    devAuthenticated.value = true;
    isAuthenticated.value = true;
  }

  function signOutDev() {
    devAuthenticated.value = false;
    isAuthenticated.value = false;
    platformRoles.value = [];
  }

  return {
    isAuthenticated,
    isLoading,
    isMember,
    userId,
    displayName,
    email,
    avatarUrl,
    balance,
    platformRoles,
    rolesLoading,
    isAdmin,
    isModerator,
    logtoEnabled,
    setAccessTokenGetter,
    getAccessToken,
    setAuthState,
    setProfile,
    clearProfile,
    setPlatformRoles,
    setRolesLoading,
    signInDev,
    signOutDev,
  };
});
