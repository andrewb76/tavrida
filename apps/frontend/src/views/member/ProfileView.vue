<script setup lang="ts">
import PlaceholderPage from '@/components/PlaceholderPage.vue';
import ProfileAvatarPreviewModal from '@/components/profile/ProfileAvatarPreviewModal.vue';
import ProfilePrivateNoteModal from '@/components/profile/ProfilePrivateNoteModal.vue';
import ProfileRatingStats from '@/components/profile/ProfileRatingStats.vue';
import UserAvatar from '@/components/user/UserAvatar.vue';
import { UiButton } from '@tavrida/ui';
import { useLogto } from '@logto/vue';
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { toast } from 'vue-sonner';
import { useAuth } from '@/composables/useAuth';
import { isLogtoConfigured } from '@/config/logto';
import { createInvite, listInvites, type CreatedInvite, type InviteRecord } from '@/services/invite';
import { syncLogtoProfile } from '@/services/logtoProfile';
import { fetchPublicProfile, publicProfileLabel, type PublicProfile } from '@/services/profile';
import { useSessionStore } from '@/stores/session';

const route = useRoute();
const router = useRouter();
const session = useSessionStore();
const auth = useAuth();
const logto = isLogtoConfigured() ? useLogto() : null;
const noteModalOpen = ref(false);
const avatarPreviewOpen = ref(false);
const avatarPreviewUrl = ref<string | null>(null);
const avatarPreviewLabel = ref('');
const isMe = computed(() => route.name === 'profile-me');
const userId = computed(() => route.params.userId as string | undefined);

const loading = ref(false);
const lastCreated = ref<CreatedInvite | null>(null);
const history = ref<InviteRecord[]>([]);
const avatarLoadFailed = ref(false);

const publicProfile = ref<PublicProfile | null>(null);
const publicLoading = ref(false);
const publicError = ref<string | null>(null);

const effectiveProfileId = computed(() =>
  session.isImpersonating ? session.actAsUserId : session.userId,
);
const effectiveDisplayName = computed(() => {
  if (!session.isImpersonating) return session.displayName;
  return publicProfile.value
    ? publicProfileLabel(publicProfile.value)
    : session.actAsDisplayName || 'Участник';
});
const effectiveAvatarUrl = computed(() =>
  session.isImpersonating ? publicProfile.value?.avatarUrl : session.avatarUrl,
);
const effectiveEmail = computed(() =>
  session.isImpersonating ? undefined : session.email,
);

const canCreateInvite = computed(
  () => isMe.value && session.isMember && !session.isLoading,
);

const avatarInitial = computed(() => {
  const source = effectiveDisplayName.value.trim() || effectiveProfileId.value || '?';
  return source.charAt(0).toUpperCase();
});

const publicLabel = computed(() =>
  publicProfile.value ? publicProfileLabel(publicProfile.value) : 'Участник',
);

watch(
  effectiveAvatarUrl,
  () => {
    avatarLoadFailed.value = false;
  },
);

async function refreshProfile() {
  if (!isMe.value || session.isImpersonating || !logto?.isAuthenticated.value) return;
  await syncLogtoProfile(logto, session);
}

async function refreshHistory() {
  if (!canCreateInvite.value) return;
  history.value = await listInvites();
}

let profileGeneration = 0;

async function loadDisplayedProfile() {
  const generation = ++profileGeneration;
  const ownProfile = isMe.value;
  const id = ownProfile ? effectiveProfileId.value : userId.value;
  publicProfile.value = null;
  publicError.value = null;
  publicLoading.value = !ownProfile && Boolean(id);
  if (!id) return;

  if (!ownProfile && effectiveProfileId.value === id) {
    publicLoading.value = false;
    await router.replace({ name: 'profile-me' });
    return;
  }

  try {
    const profile = await fetchPublicProfile(id);
    if (generation !== profileGeneration) return;
    publicProfile.value = profile;
  } catch (e) {
    if (generation !== profileGeneration || ownProfile) return;
    publicError.value =
      e instanceof Error ? e.message : 'Не удалось загрузить профиль';
  } finally {
    if (generation === profileGeneration) publicLoading.value = false;
  }
}

onMounted(() => {
  void refreshProfile();
  void refreshHistory();
});

watch(
  [isMe, userId, effectiveProfileId],
  () => void loadDisplayedProfile(),
  { immediate: true },
);

function onRatingUpdated(rating: PublicProfile['rating']) {
  if (publicProfile.value) {
    publicProfile.value = { ...publicProfile.value, rating };
  }
}

async function openAvatarPreview(url: string | null | undefined, label: string) {
  if (!url) return;
  avatarPreviewUrl.value = url;
  avatarPreviewLabel.value = label;
  await nextTick();
  avatarPreviewOpen.value = true;
}

const canPreviewMyAvatar = computed(
  () => Boolean(effectiveAvatarUrl.value && !avatarLoadFailed.value),
);

const canPreviewPublicAvatar = computed(
  () => Boolean(publicProfile.value?.avatarUrl),
);

async function create() {
  if (!canCreateInvite.value) {
    toast.error('Сначала войдите в аккаунт');
    return;
  }

  loading.value = true;
  try {
    lastCreated.value = await createInvite();
    history.value = await listInvites();
    toast.success('Инвайт создан');
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Ошибка');
  } finally {
    loading.value = false;
  }
}

async function copyInviteLink() {
  if (!lastCreated.value?.link) return;
  await navigator.clipboard.writeText(lastCreated.value.link);
  toast.success('Ссылка скопирована');
}
</script>

<template>
  <PlaceholderPage
    wireframe="W07"
    :title="isMe ? 'Мой профиль' : publicLabel"
    :description="isMe ? 'Рейтинг, heatmap (d3), активность.' : 'Публичная визитка участника клуба.'"
  >
    <template v-if="isMe">
      <section class="mb-6 flex items-center gap-4 rounded-lg border border-border bg-bg p-4">
        <button
          type="button"
          class="profile-avatar-trigger"
          :class="{ 'profile-avatar-trigger--interactive': canPreviewMyAvatar }"
          :disabled="!canPreviewMyAvatar"
          :aria-label="canPreviewMyAvatar ? `Открыть аватар ${effectiveDisplayName}` : undefined"
          @click="openAvatarPreview(effectiveAvatarUrl, effectiveDisplayName)"
        >
          <div
            class="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/15 text-xl font-semibold text-primary"
          >
            <span aria-hidden="true">{{ avatarInitial }}</span>
            <img
              v-if="effectiveAvatarUrl && !avatarLoadFailed"
              :src="effectiveAvatarUrl"
              :alt="effectiveDisplayName"
              class="absolute inset-0 size-full object-cover"
              referrerpolicy="no-referrer"
              @error="avatarLoadFailed = true"
            >
          </div>
        </button>

        <div class="min-w-0 flex-1">
          <p class="truncate text-lg font-semibold text-text">
            {{ effectiveDisplayName }}
          </p>
          <p
            v-if="effectiveEmail"
            class="truncate text-sm text-text-muted"
          >
            {{ effectiveEmail }}
          </p>
          <p
            v-if="effectiveProfileId"
            class="mt-1 truncate font-mono text-xs text-text-muted"
          >
            ID: {{ effectiveProfileId }}
          </p>
          <p class="mt-2 text-xs text-text-muted">
            Участник клуба
          </p>
        </div>
      </section>

      <ProfileRatingStats
        v-if="publicProfile?.rating"
        :rating="publicProfile.rating"
        @updated="onRatingUpdated"
      />

      <div class="space-y-4 border-b border-border pb-6">
        <div>
          <p class="text-sm font-medium text-text">
            Пригласить в клуб
          </p>
          <p class="mt-1 text-sm text-text-muted">
            Создайте ссылку и отправьте другу. После регистрации через Logto он сразу попадёт в клуб.
          </p>
        </div>

        <UiButton
          intent="primary"
          :disabled="loading || !canCreateInvite"
          @click="create"
        >
          {{ loading ? 'Создаём…' : 'Создать инвайт' }}
        </UiButton>

        <p
          v-if="isMe && session.isLoading"
          class="text-sm text-text-muted"
        >
          Проверяем сессию…
        </p>
        <p
          v-else-if="isMe && !session.isMember"
          class="text-sm text-text-muted"
        >
          <UiButton
            intent="ghost"
            size="sm"
            @click="auth.signIn('/profile/me')"
          >
            Войти, чтобы создавать инвайты
          </UiButton>
        </p>

        <div
          v-if="lastCreated"
          class="space-y-3 rounded-lg border border-border bg-bg p-4"
        >
          <p class="text-sm font-medium text-text">
            Ссылка для приглашения
          </p>
          <p class="break-all rounded-md bg-surface px-3 py-2 font-mono text-sm text-text">
            {{ lastCreated.link }}
          </p>
          <UiButton
            intent="secondary"
            size="sm"
            @click="copyInviteLink"
          >
            Копировать ссылку инвайта
          </UiButton>
          <p class="text-xs text-text-muted">
            Действует до {{ new Date(lastCreated.expiresAt).toLocaleDateString('ru-RU') }}
          </p>
        </div>
      </div>

      <ul
        v-if="history.length"
        class="space-y-2"
      >
        <li class="text-xs font-medium uppercase tracking-wide text-text-muted">
          Недавние инвайты
        </li>
        <li
          v-for="item in history.slice(0, 5)"
          :key="item.code"
          class="flex items-center justify-between gap-2 text-sm"
        >
          <code class="font-mono text-text-muted">{{ item.code }}</code>
          <span class="text-xs text-text-muted">
            {{ new Date(item.createdAt).toLocaleDateString('ru-RU') }}
          </span>
        </li>
      </ul>
    </template>

    <template v-else>
      <p
        v-if="publicLoading"
        class="text-sm text-text-muted"
      >
        Загрузка профиля…
      </p>
      <p
        v-else-if="publicError"
        class="text-sm text-error"
      >
        {{ publicError }}
      </p>
      <template v-else-if="publicProfile">
        <section class="profile-public-card">
          <button
            type="button"
            class="profile-avatar-trigger"
            :class="{ 'profile-avatar-trigger--interactive': canPreviewPublicAvatar }"
            :disabled="!canPreviewPublicAvatar"
            :aria-label="canPreviewPublicAvatar ? `Открыть аватар ${publicLabel}` : undefined"
            @click="openAvatarPreview(publicProfile.avatarUrl, publicLabel)"
          >
            <UserAvatar
              :avatar-url="publicProfile.avatarUrl"
              :label="publicLabel"
              size="lg"
            />
          </button>
          <div class="profile-public-card__body">
            <div class="profile-public-card__title-row">
              <h2 class="profile-public-card__name">
                {{ publicLabel }}
              </h2>
              <span
                v-if="publicProfile.isSuspended"
                class="profile-public-card__badge"
              >
                Заблокирован
              </span>
            </div>
            <p
              v-if="publicProfile.username && publicProfile.username !== publicProfile.displayName"
              class="profile-public-card__username"
            >
              @{{ publicProfile.username }}
            </p>
            <p class="profile-public-card__meta">
              Участник с {{ new Date(publicProfile.memberSince).toLocaleDateString('ru-RU') }}
            </p>
            <UiButton
              intent="secondary"
              size="sm"
              class="profile-public-card__note-btn"
              @click="noteModalOpen = true"
            >
              📝 Заметка
            </UiButton>
          </div>
        </section>

        <ProfileRatingStats
          :rating="publicProfile.rating"
          @updated="onRatingUpdated"
        />

        <ProfilePrivateNoteModal
          v-model:open="noteModalOpen"
          :profile="publicProfile"
        />
      </template>
    </template>

    <ProfileAvatarPreviewModal
      v-model:open="avatarPreviewOpen"
      :avatar-url="avatarPreviewUrl ?? ''"
      :label="avatarPreviewLabel"
    />
  </PlaceholderPage>
</template>

<style scoped>
.profile-avatar-trigger {
  display: inline-flex;
  flex-shrink: 0;
  padding: 0;
  border: none;
  background: transparent;
  border-radius: 9999px;
}

.profile-avatar-trigger--interactive {
  cursor: zoom-in;
  transition: box-shadow 0.15s ease, transform 0.15s ease;
}

.profile-avatar-trigger--interactive:hover {
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary, #2563eb) 35%, transparent);
}

.profile-avatar-trigger--interactive:focus-visible {
  outline: 2px solid var(--color-primary, #2563eb);
  outline-offset: 2px;
}

.profile-avatar-trigger:disabled {
  cursor: default;
}

.profile-public-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding: 1rem;
  border: 1px solid var(--color-border, #ddd);
  border-radius: 0.5rem;
  background: var(--color-bg, #fff);
}

.profile-public-card__body {
  min-width: 0;
  flex: 1;
}

.profile-public-card__title-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

.profile-public-card__name {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-text, #111);
}

.profile-public-card__badge {
  border-radius: 9999px;
  background: color-mix(in srgb, #b42318 12%, transparent);
  color: #b42318;
  font-size: 0.75rem;
  font-weight: 500;
  padding: 0.15rem 0.5rem;
}

.profile-public-card__username {
  margin: 0.15rem 0 0;
  font-size: 0.875rem;
  color: var(--color-text-muted, #666);
}

.profile-public-card__meta {
  margin: 0.35rem 0 0;
  font-size: 0.875rem;
  color: var(--color-text-muted, #666);
}

.profile-public-card__note-btn {
  margin-top: 0.5rem;
}
</style>
