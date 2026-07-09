<script setup lang="ts">
import PlaceholderPage from '@/components/PlaceholderPage.vue';
import { UiButton } from '@tavrida/ui';
import { ref } from 'vue';
import { toast } from 'vue-sonner';
import { createInvite, listMockInvites, type CreatedInvite } from '@/services/invite';
import { useSessionStore } from '@/stores/session';

const session = useSessionStore();

const email = ref('');
const loading = ref(false);
const lastCreated = ref<CreatedInvite | null>(null);
const history = ref(listMockInvites());

async function create() {
  loading.value = true;
  try {
    lastCreated.value = await createInvite({
      email: email.value || undefined,
      inviterId: session.userId,
    });
    history.value = listMockInvites();
    email.value = '';
    toast.success('Приглашение создано');
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Ошибка');
  } finally {
    loading.value = false;
  }
}

async function copy(text: string, label: string) {
  await navigator.clipboard.writeText(text);
  toast.success(`${label} скопирован`);
}
</script>

<template>
  <PlaceholderPage
    wireframe="W13"
    title="Пригласить в клуб"
    description="Ссылка или код TAV-… — для новых участников. Друг регистрируется через Logto и сразу попадает в клуб."
  >
    <form class="space-y-3" @submit.prevent="create">
      <label class="block text-sm text-text-muted" for="invite-email">
        Email друга (необязательно)
      </label>
      <input
        id="invite-email"
        v-model="email"
        type="email"
        class="w-full rounded-md border border-border bg-bg px-3 py-2 text-text"
        placeholder="friend@example.com"
        autocomplete="off"
      />
      <UiButton type="submit" intent="primary" :disabled="loading">
        {{ loading ? 'Создаём…' : 'Создать приглашение' }}
      </UiButton>
    </form>

    <div
      v-if="lastCreated"
      class="mt-6 space-y-3 rounded-lg border border-border bg-surface p-4"
    >
      <p class="text-sm font-medium text-text">Новое приглашение</p>
      <div class="flex flex-wrap items-center gap-2">
        <code class="rounded bg-bg px-2 py-1 font-mono text-lg tracking-wide text-primary">
          {{ lastCreated.code }}
        </code>
        <UiButton intent="ghost" size="sm" @click="copy(lastCreated.code, 'Код')">
          Копировать код
        </UiButton>
      </div>
      <div class="flex flex-wrap gap-2">
        <UiButton intent="secondary" size="sm" @click="copy(lastCreated.link, 'Ссылка')">
          Копировать ссылку
        </UiButton>
      </div>
      <p class="text-xs text-text-muted">
        Действует до {{ new Date(lastCreated.expiresAt).toLocaleDateString('ru-RU') }}
        <span v-if="lastCreated.email"> · для {{ lastCreated.email }}</span>
      </p>
    </div>

    <ul v-if="history.length" class="mt-8 space-y-2 border-t border-border pt-6">
      <li class="text-xs font-medium uppercase tracking-wide text-text-muted">
        Недавние (mock)
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
  </PlaceholderPage>
</template>
