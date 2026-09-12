<script setup lang="ts">
import { UiButton } from '@tavrida/ui';
import { computed, onMounted, ref } from 'vue';
import { toast } from 'vue-sonner';
import { useAuth } from '@/composables/useAuth';
import { createInvite, listInvites, type CreatedInvite, type InviteRecord } from '@/services/invite';
import { useSessionStore } from '@/stores/session';

const props = defineProps<{
  userId: string;
  isOwner: boolean;
  isAdmin: boolean;
}>();

const auth = useAuth();
const session = useSessionStore();

const loading = ref(false);
const inviteEmail = ref('');
const inviteError = ref<string | null>(null);
const lastCreated = ref<CreatedInvite | null>(null);
const history = ref<InviteRecord[]>([]);

const canCreateInvite = computed(
  () => props.isOwner && session.isMember && !session.isLoading,
);

function inviteErrorMessage(e: unknown): string {
  const raw = e instanceof Error ? e.message : 'Не удалось создать инвайт';
  if (/monthly invite limit reached/i.test(raw)) {
    const n = raw.match(/\((\d+)\)/)?.[1];
    return n
      ? `Месячный лимит инвайтов исчерпан (${n})`
      : 'Месячный лимит инвайтов исчерпан';
  }
  if (/not enforceable/i.test(raw)) {
    return 'Лимит инвайтов не настроен — обратитесь к администратору';
  }
  if (/create invite failed/i.test(raw)) {
    return 'Не удалось создать инвайт. Попробуйте позже.';
  }
  if (/email is required/i.test(raw)) {
    return 'Укажите email приглашаемого';
  }
  return raw;
}

async function refreshHistory() {
  if (!canCreateInvite.value && !props.isAdmin) return;
  history.value = await listInvites();
}

async function create() {
  if (!canCreateInvite.value) {
    inviteError.value = 'Сначала войдите в аккаунт';
    toast.error(inviteError.value, { duration: Infinity });
    return;
  }

  loading.value = true;
  inviteError.value = null;
  try {
    lastCreated.value = await createInvite({ email: inviteEmail.value || undefined });
    inviteEmail.value = '';
    history.value = await listInvites();
    toast.success('Инвайт создан');
  } catch (e) {
    const message = inviteErrorMessage(e);
    inviteError.value = message;
    toast.error(message, { duration: Infinity });
  } finally {
    loading.value = false;
  }
}

async function copyInviteLink() {
  if (!lastCreated.value?.link) return;
  await navigator.clipboard.writeText(lastCreated.value.link);
  toast.success('Ссылка скопирована');
}

onMounted(() => {
  void refreshHistory();
});
</script>

<template>
  <div class="profile-invites">
    <template v-if="isOwner || isAdmin">
      <div>
        <p class="text-sm font-medium text-text">
          Пригласить в клуб
        </p>
        <p class="mt-1 text-sm text-text-muted">
          Создайте ссылку и отправьте другу. После регистрации через Logto он сразу попадёт в клуб.
        </p>
      </div>

      <div class="flex items-center gap-2">
        <input
          v-model="inviteEmail"
          type="email"
          required
          placeholder="Email приглашаемого"
          class="flex-1 rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
        >
        <UiButton
          intent="primary"
          :disabled="loading || !canCreateInvite || !inviteEmail.trim()"
          @click="create"
        >
          {{ loading ? 'Создаём…' : 'Создать инвайт' }}
        </UiButton>
      </div>

      <p
        v-if="inviteError"
        role="alert"
        class="rounded-md border border-error/40 bg-error/10 px-3 py-2 text-sm text-error"
      >
        {{ inviteError }}
      </p>

      <p
        v-if="isOwner && session.isLoading"
        class="text-sm text-text-muted"
      >
        Проверяем сессию…
      </p>
      <p
        v-else-if="isOwner && !session.isMember"
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
    </template>

    <p
      v-else
      class="text-sm text-text-muted"
    >
      Инвайты доступны только владельцу профиля.
    </p>

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
  </div>
</template>

<style scoped>
.profile-invites {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
</style>
