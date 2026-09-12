<script setup lang="ts">
import PlaceholderPage from '@/components/PlaceholderPage.vue';
import ProfileAvatarPreviewModal from '@/components/profile/ProfileAvatarPreviewModal.vue';
import ProfilePrivateNoteModal from '@/components/profile/ProfilePrivateNoteModal.vue';
import ProfileRatingStats from '@/components/profile/ProfileRatingStats.vue';
import ProfileTabs, { type ProfileTab } from '@/components/profile/ProfileTabs.vue';
import ProfilePostsTab from '@/components/profile/ProfilePostsTab.vue';
import ProfileCommentsTab from '@/components/profile/ProfileCommentsTab.vue';
import ProfileActivityTab from '@/components/profile/ProfileActivityTab.vue';
import ProfileInvitesTab from '@/components/profile/ProfileInvitesTab.vue';
import ProfileReferralTreeTab from '@/components/profile/ProfileReferralTreeTab.vue';
import ProfileCompletionMeter from '@/components/profile/ProfileCompletionMeter.vue';
import ProfileTopContributions from '@/components/profile/ProfileTopContributions.vue';
import MedalBadges from '@/components/profile/MedalBadges.vue';
import UserAvatar from '@/components/user/UserAvatar.vue';
import { UiButton } from '@tavrida/ui';
import { useLogto } from '@logto/vue';
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { toast } from 'vue-sonner';
import { isLogtoConfigured, logtoAccountUsernameUrl } from '@/config/logto';
import { getSubscription, type UserSubscription } from '@/services/plans';
import { syncLogtoProfile } from '@/services/logtoProfile';
import { fetchPublicProfile, publicProfileLabel, type ProfileNote, type PublicProfile, updateMyProfile } from '@/services/profile';
import { openDirectChat, PlanFeatureError } from '@/services/chats';
import { uploadFile } from '@/services/media';
import { useSessionStore } from '@/stores/session';

const route = useRoute();
const router = useRouter();
const session = useSessionStore();
const logto = isLogtoConfigured() ? useLogto() : null;
const noteModalOpen = ref(false);
const hasPrivateNote = ref(false);
const avatarPreviewOpen = ref(false);
const avatarPreviewUrl = ref<string | null>(null);
const avatarPreviewLabel = ref('');
const isMe = computed(() => route.name === 'profile-me');
const userId = computed(() => route.params.userId as string | undefined);
const logtoUsernameUrl = computed(() =>
  isMe.value && isLogtoConfigured() && !session.isImpersonating
    ? logtoAccountUsernameUrl(`${window.location.origin}/profile/me`)
    : null,
);

const avatarLoadFailed = ref(false);
const subscription = ref<UserSubscription | null>(null);
const activeTab = ref<ProfileTab>('overview');

const profileIdForTabs = computed(() =>
  isMe.value ? effectiveProfileId.value : (userId.value ?? ''),
);

const editing = ref(false);
const editDisplayName = ref('');
const editAvatarUrl = ref('');
const avatarInput = ref<HTMLInputElement | null>(null);
const avatarBusy = ref(false);
const saving = ref(false);

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

const PLAN_TITLES: Record<string, string> = { free: 'Бесплатно', basic: 'Базовый', pro: 'Про' };

const planTitle = computed(() => PLAN_TITLES[subscription.value?.planId ?? ''] ?? subscription.value?.planId ?? '—');

const daysLeft = computed(() => {
  const exp = subscription.value?.expiresAt;
  if (!exp) return null;
  const diff = Math.ceil((new Date(exp).getTime() - Date.now()) / 864e5);
  return diff > 0 ? diff : 0;
});

async function refreshSubscription() {
  if (!isMe.value || !session.isMember) return;
  try {
    subscription.value = await getSubscription();
  } catch { /* silent */ }
}

let profileGeneration = 0;
let loadedProfileId: string | null = null;

async function loadDisplayedProfile() {
  const generation = ++profileGeneration;
  const ownProfile = isMe.value;
  const id = ownProfile ? effectiveProfileId.value : userId.value;
  publicError.value = null;
  publicLoading.value = !ownProfile && Boolean(id);
  if (!id) {
    publicProfile.value = null;
    loadedProfileId = null;
    return;
  }

  if (!ownProfile && effectiveProfileId.value === id) {
    publicLoading.value = false;
    await router.replace({ name: 'profile-me' });
    return;
  }

  // Keep previous card visible while reloading the same id — avoids flashing
  // away the private-note CTA on session/identity refreshes.
  if (loadedProfileId !== id) {
    publicProfile.value = null;
    hasPrivateNote.value = false;
  }

  try {
    const profile = await fetchPublicProfile(id);
    if (generation !== profileGeneration) return;
    publicProfile.value = profile;
    loadedProfileId = id;
  } catch (e) {
    if (generation !== profileGeneration || ownProfile) return;
    publicProfile.value = null;
    loadedProfileId = null;
    publicError.value =
      e instanceof Error ? e.message : 'Не удалось загрузить профиль';
  } finally {
    if (generation === profileGeneration) publicLoading.value = false;
  }
}

onMounted(() => {
  void refreshProfile();
  void refreshSubscription();

  const showSuccess = typeof route.query.show_success === 'string' ? route.query.show_success : null;
  if (showSuccess && isMe.value) {
    void router.replace({ name: 'profile-me', query: {} });
    void refreshProfile().then(() => {
      toast.success(
        showSuccess === 'true' || showSuccess === 'profile'
          ? 'Профиль обновлён'
          : 'Настройки аккаунта обновлены',
      );
    });
  }
});

watch(
  [isMe, userId, effectiveProfileId],
  () => void loadDisplayedProfile(),
  { immediate: true },
);

function onPrivateNoteChanged(note: ProfileNote | null) {
  hasPrivateNote.value = Boolean(note?.text?.trim());
}

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

function startEdit() {
  editDisplayName.value = effectiveDisplayName.value;
  editAvatarUrl.value = effectiveAvatarUrl.value || '';
  editing.value = true;
}

function cancelEdit() {
  editing.value = false;
}

async function saveProfile() {
  saving.value = true;
  try {
    await updateMyProfile({
      displayName: editDisplayName.value || null,
      avatarUrl: editAvatarUrl.value || null,
    });
    await refreshProfile();
    editing.value = false;
    toast.success('Профиль обновлён');
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Не удалось сохранить');
  } finally {
    saving.value = false;
  }
}

function triggerAvatarUpload() {
  avatarInput.value?.click();
}

async function onAvatarSelected(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    toast.error('Выберите изображение');
    return;
  }
  avatarBusy.value = true;
  try {
    const uploaded = await uploadFile('profile', file);
    editAvatarUrl.value = uploaded.url;
    await updateMyProfile({
      displayName: editDisplayName.value || null,
      avatarUrl: uploaded.url,
    });
    await refreshProfile();
    toast.success('Аватар обновлён');
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Не удалось загрузить аватар');
  } finally {
    avatarBusy.value = false;
  }
}

const writing = ref(false);
const planFeatureError = ref<string | null>(null);

async function writeMessage() {
  const id = publicProfile.value?.userId ?? userId.value;
  if (!id || writing.value) return;
  writing.value = true;
  planFeatureError.value = null;
  try {
    const chat = await openDirectChat(id);
    await router.push({ name: 'chat-room', params: { chatId: chat.id } });
  } catch (e) {
    if (e instanceof PlanFeatureError) {
      planFeatureError.value = 'Личные сообщения доступны на тарифах Basic и Pro. Откройте раздел «Подписки» для подробностей.';
      toast.error(planFeatureError.value, { id: 'plan-feature', duration: 10_000 });
    } else {
      toast.error(e instanceof Error ? e.message : 'Не удалось открыть чат', { id: 'write-chat' });
    }
  } finally {
    writing.value = false;
  }
}
</script>

<template>
  <PlaceholderPage
    wireframe="W07"
    :title="isMe ? 'Мой профиль' : publicLabel"
    :description="isMe ? 'Рейтинг, heatmap (d3), активность.' : 'Публичная визитка участника клуба.'"
  >
    <!-- MY PROFILE: header card -->
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
          <template v-if="!editing">
            <p class="truncate text-lg font-semibold text-text">
              {{ effectiveDisplayName }}
            </p>
          </template>
          <template v-else>
            <input
              v-model="editDisplayName"
              type="text"
              maxlength="256"
              placeholder="Имя"
              class="mb-2 w-full rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-text focus:border-primary focus:outline-none"
            >
            <input
              ref="avatarInput"
              type="file"
              accept="image/*"
              class="hidden"
              @change="onAvatarSelected"
            >
            <div class="mb-2 flex items-center gap-3">
              <div
                class="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/15 text-sm font-semibold text-primary"
              >
                <img
                  v-if="editAvatarUrl"
                  :src="editAvatarUrl"
                  class="size-full object-cover"
                >
                <span v-else>{{ avatarInitial }}</span>
              </div>
              <UiButton
                intent="ghost"
                size="sm"
                :disabled="avatarBusy"
                @click="triggerAvatarUpload"
              >
                {{ avatarBusy ? 'Загрузка…' : 'Выбрать аватар' }}
              </UiButton>
              <UiButton
                v-if="editAvatarUrl"
                intent="ghost"
                size="sm"
                @click="editAvatarUrl = ''"
              >
                Убрать
              </UiButton>
            </div>
            <div class="flex gap-2">
              <UiButton
                intent="primary"
                size="sm"
                :disabled="saving"
                @click="saveProfile"
              >
                {{ saving ? 'Сохраняем…' : 'Сохранить' }}
              </UiButton>
              <UiButton
                intent="ghost"
                size="sm"
                :disabled="saving"
                @click="cancelEdit"
              >
                Отмена
              </UiButton>
            </div>
          </template>
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
          <p
            v-if="isMe && !editing"
            class="mt-3 flex flex-wrap gap-3"
          >
            <button
              type="button"
              class="inline-flex items-center text-sm font-medium text-primary underline-offset-2 hover:underline"
              @click="startEdit"
            >
              Изменить имя и аватар
            </button>
            <a
              v-if="logtoUsernameUrl"
              :href="logtoUsernameUrl"
              class="inline-flex items-center text-sm font-medium text-primary underline-offset-2 hover:underline"
            >
              Изменить @username
            </a>
          </p>
        </div>
      </section>

      <!-- Tabs -->
      <ProfileTabs
        :counts="{ posts: publicProfile?.rating?.postCount, comments: publicProfile?.rating?.commentCount }"
        @update:tab="activeTab = $event"
      >
        <template #overview>
          <ProfileCompletionMeter
            v-if="publicProfile"
            :profile="publicProfile"
            :subscription="subscription"
            :is-me="true"
          />

          <ProfileRatingStats
            v-if="publicProfile?.rating"
            :rating="publicProfile.rating"
            class="mt-4"
            @updated="onRatingUpdated"
          />

          <MedalBadges
            v-if="publicProfile?.userId"
            :user-id="publicProfile.userId"
            class="mt-4"
          />

          <ProfileTopContributions
            v-if="publicProfile?.userId"
            :user-id="publicProfile.userId"
            class="mt-4"
          />

          <section
            v-if="subscription"
            class="profile-plan-card mt-4"
          >
            <div class="profile-plan-card__row">
              <span class="profile-plan-card__label">Тариф</span>
              <span class="profile-plan-card__value">{{ planTitle }}</span>
            </div>
            <div
              v-if="subscription.expiresAt"
              class="profile-plan-card__row"
            >
              <span class="profile-plan-card__label">Действует до</span>
              <span class="profile-plan-card__value">
                {{ new Date(subscription.expiresAt).toLocaleDateString('ru-RU') }}
                <template v-if="daysLeft != null">
                  <span class="profile-plan-card__muted">({{ daysLeft }} {{ daysLeft === 1 ? 'день' : daysLeft < 5 ? 'дня' : 'дней' }})</span>
                </template>
              </span>
            </div>
            <div class="profile-plan-card__row">
              <span class="profile-plan-card__label">Автопродление</span>
              <span class="profile-plan-card__value">{{ subscription.autoRenew ? 'Вкл' : 'Выкл' }}</span>
            </div>
            <RouterLink
              :to="{ name: 'plans' }"
              class="profile-plan-card__link"
            >
              Изменить тариф
            </RouterLink>
          </section>
        </template>

        <template #posts>
          <ProfilePostsTab v-if="profileIdForTabs" :user-id="profileIdForTabs" />
        </template>

        <template #comments>
          <ProfileCommentsTab v-if="profileIdForTabs" :user-id="profileIdForTabs" />
        </template>

        <template #activity>
          <ProfileActivityTab v-if="profileIdForTabs" :user-id="profileIdForTabs" />
        </template>

        <template #invites>
          <ProfileInvitesTab
            v-if="profileIdForTabs"
            :user-id="profileIdForTabs"
            :is-owner="isMe"
            :is-admin="session.isAdmin"
          />
        </template>

        <template #referral-tree>
          <ProfileReferralTreeTab
            v-if="profileIdForTabs"
            :user-id="profileIdForTabs"
          />
        </template>
      </ProfileTabs>
    </template>

    <!-- PUBLIC PROFILE: header card -->
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
            <p
              v-if="publicProfile.presenceStatus && publicProfile.presenceStatus !== 'offline'"
              class="profile-public-card__presence"
              :class="{
                'profile-public-card__presence--online': publicProfile.presenceStatus === 'online',
                'profile-public-card__presence--away': publicProfile.presenceStatus === 'away',
              }"
            >
              <span class="profile-public-card__presence-dot" />
              {{ publicProfile.presenceStatus === 'online' ? 'В сети' : 'Отошёл(а)' }}
            </p>
            <p
              v-else-if="publicProfile.presenceStatus === 'offline'"
              class="profile-public-card__presence profile-public-card__presence--offline"
            >
              В сети недавно
            </p>
            <p class="profile-public-card__meta">
              Участник с {{ new Date(publicProfile.memberSince).toLocaleDateString('ru-RU') }}
            </p>
            <div class="profile-public-card__note">
              <p class="profile-public-card__note-hint">
                Личная заметка видна только вам
              </p>
              <div class="flex flex-wrap gap-2">
                <UiButton
                  intent="primary"
                  size="sm"
                  type="button"
                  :disabled="writing"
                  @click="writeMessage"
                >
                  Написать
                </UiButton>
                <UiButton
                  intent="secondary"
                  size="sm"
                  class="profile-public-card__note-btn"
                  @click="noteModalOpen = true"
                >
                  {{ hasPrivateNote ? 'Открыть заметку' : 'Добавить заметку' }}
                </UiButton>
              </div>
              <p
                v-if="planFeatureError"
                role="alert"
                class="profile-public-card__plan-error"
              >
                {{ planFeatureError }}
              </p>
            </div>
          </div>
        </section>

        <!-- Tabs -->
        <ProfileTabs
          :counts="{ posts: publicProfile.rating?.postCount, comments: publicProfile.rating?.commentCount }"
          @update:tab="activeTab = $event"
        >
          <template #overview>
            <ProfileRatingStats
              :rating="publicProfile.rating"
              @updated="onRatingUpdated"
            />

            <MedalBadges :user-id="publicProfile.userId" class="mt-4" />

            <ProfileTopContributions :user-id="publicProfile.userId" class="mt-4" />
          </template>

          <template #posts>
            <ProfilePostsTab :user-id="publicProfile.userId" />
          </template>

          <template #comments>
            <ProfileCommentsTab :user-id="publicProfile.userId" />
          </template>

          <template #activity>
            <ProfileActivityTab :user-id="publicProfile.userId" />
          </template>

          <template #invites>
            <ProfileInvitesTab
              :user-id="publicProfile.userId"
              :is-owner="false"
              :is-admin="session.isAdmin"
            />
          </template>

          <template #referral-tree>
            <ProfileReferralTreeTab :user-id="publicProfile.userId" />
          </template>
        </ProfileTabs>

        <ProfilePrivateNoteModal
          v-model:open="noteModalOpen"
          :profile="publicProfile"
          @note-changed="onPrivateNoteChanged"
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
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary) 35%, transparent);
}

.profile-avatar-trigger--interactive:focus-visible {
  outline: 2px solid var(--color-primary);
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
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  background: var(--color-bg);
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
  color: var(--color-text);
}

.profile-public-card__badge {
  border-radius: 9999px;
  background: color-mix(in srgb, #b42318 12%, transparent);
  color: var(--color-error);
  font-size: 0.75rem;
  font-weight: 500;
  padding: 0.15rem 0.5rem;
}

.profile-public-card__username {
  margin: 0.15rem 0 0;
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.profile-public-card__presence {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  margin: 0.35rem 0 0;
  font-size: 0.8125rem;
  font-weight: 500;
}

.profile-public-card__presence--online {
  color: #16a34a;
}

.profile-public-card__presence--away {
  color: #d97706;
}

.profile-public-card__presence--offline {
  color: var(--color-text-muted);
}

.profile-public-card__presence-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
}

.profile-public-card__meta {
  margin: 0.35rem 0 0;
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.profile-public-card__note {
  margin-top: 0.75rem;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.35rem;
}

.profile-public-card__note-hint {
  margin: 0;
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.profile-public-card__note-btn {
  margin-top: 0;
}

.profile-public-card__plan-error {
  margin: 0.5rem 0 0;
  padding: 0.5rem 0.75rem;
  border-radius: 0.375rem;
  border: 1px solid color-mix(in srgb, var(--color-error) 40%, transparent);
  background: color-mix(in srgb, var(--color-error) 10%, transparent);
  font-size: 0.8125rem;
  color: var(--color-error);
}

.profile-plan-card {
  margin-bottom: 1.5rem;
  padding: 1rem;
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  background: var(--color-bg);
}

.profile-plan-card__row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.25rem 0;
  font-size: 0.875rem;
}

.profile-plan-card__label {
  color: var(--color-text-muted);
}

.profile-plan-card__value {
  font-weight: 500;
  color: var(--color-text);
}

.profile-plan-card__muted {
  color: var(--color-text-muted);
  font-weight: 400;
}

.profile-plan-card__link {
  display: inline-flex;
  align-items: center;
  margin-top: 0.5rem;
  font-size: 0.8125rem;
  color: var(--color-primary);
  text-decoration: none;
}

.profile-plan-card__link:hover {
  text-decoration: underline;
}
</style>
