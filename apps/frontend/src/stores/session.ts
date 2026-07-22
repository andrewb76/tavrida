import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { isLogtoConfigured } from '@/config/logto';

export type PlatformRole = 'member' | 'admin' | 'moderator' | 'expert';

type AccessTokenGetter = () => Promise<string | undefined>;

const ACT_AS_STORAGE_KEY = 'tavrida.actAs';

type ActAsPersisted = {
  actAsUserId: string;
  actAsDisplayName: string;
  actorUserId: string;
  actorDisplayName: string;
};

function loadActAs(): ActAsPersisted | null {
  try {
    const raw = localStorage.getItem(ACT_AS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActAsPersisted;
    if (!parsed?.actAsUserId || !parsed?.actorUserId) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveActAs(value: ActAsPersisted | null) {
  if (!value) {
    localStorage.removeItem(ACT_AS_STORAGE_KEY);
    return;
  }
  localStorage.setItem(ACT_AS_STORAGE_KEY, JSON.stringify(value));
}

export const useSessionStore = defineStore('session', () => {
  const logtoEnabled = isLogtoConfigured();

  const isAuthenticated = ref(false);
  const isLoading = ref(false);
  const userId = ref<string | undefined>();
  const displayName = ref('Участник');
  const email = ref<string | undefined>();
  const avatarUrl = ref<string | undefined>();
  const username = ref<string | undefined>();
  const balance = ref(0);
  const balanceCurrency = ref('RUB');
  const platformRoles = ref<PlatformRole[]>([]);
  const rolesLoading = ref(false);

  /** Impersonation (ADR-018): real admin JWT + X-Act-As target. */
  const persisted = loadActAs();
  const actAsUserId = ref<string | undefined>(persisted?.actAsUserId);
  const actAsDisplayName = ref(persisted?.actAsDisplayName ?? '');
  const actorUserId = ref<string | undefined>(persisted?.actorUserId);
  const actorDisplayName = ref(persisted?.actorDisplayName ?? '');

  /** Dev-only when Logto env is missing */
  const devAuthenticated = ref(false);

  let accessTokenGetter: AccessTokenGetter | null = null;

  /** Logto JWT = club member (ADR-012). Dev mock: devAuthenticated. */
  const isMember = computed(() => {
    if (logtoEnabled) return isAuthenticated.value;
    return devAuthenticated.value;
  });

  const isImpersonating = computed(() => Boolean(actAsUserId.value));

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
    username?: string;
  }) {
    userId.value = profile.sub;
    if (profile.name) displayName.value = profile.name;
    email.value = profile.email;
    avatarUrl.value = profile.avatarUrl;
    username.value = profile.username;
  }

  function clearProfile() {
    userId.value = undefined;
    displayName.value = 'Участник';
    email.value = undefined;
    avatarUrl.value = undefined;
    username.value = undefined;
  }

  function setBalance(amount: number, currency = 'RUB') {
    balance.value = amount;
    balanceCurrency.value = currency;
  }

  function setPlatformRoles(roles: PlatformRole[]) {
    platformRoles.value = roles;
  }

  function setRolesLoading(loading: boolean) {
    rolesLoading.value = loading;
  }

  function startImpersonation(input: {
    targetUserId: string;
    targetDisplayName: string;
  }) {
    const actorId = userId.value;
    if (!actorId) throw new Error('Нет сессии администратора');
    const actorName = displayName.value || 'Админ';
    actAsUserId.value = input.targetUserId;
    actAsDisplayName.value = input.targetDisplayName;
    actorUserId.value = actorId;
    actorDisplayName.value = actorName;
    saveActAs({
      actAsUserId: input.targetUserId,
      actAsDisplayName: input.targetDisplayName,
      actorUserId: actorId,
      actorDisplayName: actorName,
    });
  }

  function stopImpersonation() {
    actAsUserId.value = undefined;
    actAsDisplayName.value = '';
    actorUserId.value = undefined;
    actorDisplayName.value = '';
    saveActAs(null);
  }

  function signInDev() {
    devAuthenticated.value = true;
    isAuthenticated.value = true;
  }

  function signOutDev() {
    stopImpersonation();
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
    username,
    balance,
    balanceCurrency,
    platformRoles,
    rolesLoading,
    isAdmin,
    isModerator,
    isImpersonating,
    actAsUserId,
    actAsDisplayName,
    actorUserId,
    actorDisplayName,
    logtoEnabled,
    setAccessTokenGetter,
    getAccessToken,
    setAuthState,
    setProfile,
    clearProfile,
    setBalance,
    setPlatformRoles,
    setRolesLoading,
    startImpersonation,
    stopImpersonation,
    signInDev,
    signOutDev,
  };
});
