<script setup lang="ts">
import PlaceholderPage from '@/components/PlaceholderPage.vue';
import { UiButton } from '@tavrida/ui';
import { useLogto } from '@logto/vue';
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { toast } from 'vue-sonner';
import { useAuth } from '@/composables/useAuth';
import { isLogtoConfigured } from '@/config/logto';
import { createInvite, listInvites, type CreatedInvite, type InviteRecord } from '@/services/invite';
import { syncLogtoProfile } from '@/services/logtoProfile';
import { useSessionStore } from '@/stores/session';

const route = useRoute();
const session = useSessionStore();
const auth = useAuth();
const logto = isLogtoConfigured() ? useLogto() : null;
const isMe = computed(() => route.name === 'profile-me');
const userId = computed(() => route.params.userId as string | undefined);

const loading = ref(false);
const lastCreated = ref<CreatedInvite | null>(null);
const history = ref<InviteRecord[]>([]);
const avatarLoadFailed = ref(false);

const canCreateInvite = computed(
  () => isMe.value && session.isMember && !session.isLoading,
);

const avatarInitial = computed(() => {
  const source = session.displayName.trim() || session.userId || '?';
  return source.charAt(0).toUpperCase();
});

watch(
  () => session.avatarUrl,
  () => {
    avatarLoadFailed.value = false;
  },
);

async function refreshProfile() {
  if (!isMe.value || !logto?.isAuthenticated.value) return;
  await syncLogtoProfile(logto, session);
}

async function refreshHistory() {
  if (!canCreateInvite.value) return;
  history.value = await listInvites();
}

onMounted(() => {
  void refreshProfile();
  void refreshHistory();
});

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
    :title="isMe ? 'Мой профиль' : `Профиль ${userId}`"
    description="Рейтинг, heatmap (d3), активность."
  >
    <template v-if="isMe">
      <section class="mb-6 flex items-center gap-4 rounded-lg border border-border bg-bg p-4">
        <div
          class="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/15 text-xl font-semibold text-primary"
        >
          <span aria-hidden="true">{{ avatarInitial }}</span>
          <img
            v-if="session.avatarUrl && !avatarLoadFailed"
            :src="session.avatarUrl"
            :alt="session.displayName"
            class="absolute inset-0 size-full object-cover"
            referrerpolicy="no-referrer"
            @error="avatarLoadFailed = true"
          >
        </div>

        <div class="min-w-0 flex-1">
          <p class="truncate text-lg font-semibold text-text">
            {{ session.displayName }}
          </p>
          <p
            v-if="session.email"
            class="truncate text-sm text-text-muted"
          >
            {{ session.email }}
          </p>
          <p
            v-if="session.userId"
            class="mt-1 truncate font-mono text-xs text-text-muted"
          >
            ID: {{ session.userId }}
          </p>
          <p class="mt-2 text-xs text-text-muted">
            Участник клуба
          </p>
        </div>
      </section>

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

    <p
      v-else
      class="text-sm text-text-muted"
    >
      Публичный профиль участника.
    </p>
  </PlaceholderPage>
</template>
