<script setup lang="ts">
import PlaceholderPage from '@/components/PlaceholderPage.vue';
import { UiButton } from '@tavrida/ui';
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuth } from '@/composables/useAuth';
import {
  isValidInviteCodeFormat,
  normalizeInviteCode,
  parseInviteInput,
} from '@/services/invite';

const auth = useAuth();
const router = useRouter();
const route = useRoute();

const input = ref('');
const error = ref(typeof route.query.error === 'string' ? route.query.error : '');
const loading = ref(false);
const autoStarted = ref(false);

async function beginJoin(params: {
  code?: string;
  token?: string;
  email?: string;
}) {
  error.value = '';
  loading.value = true;
  try {
    await auth.signInWithInvite({
      ...params,
      redirectAfter:
        typeof route.query.redirect === 'string' ? route.query.redirect : '/app',
    });
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Не удалось принять приглашение';
    loading.value = false;
  }
}

async function submit() {
  const parsed = parseInviteInput(input.value);
  if (!parsed.code && !parsed.token) {
    error.value = 'Введите код TAV-XXXX-XXXX или вставьте ссылку приглашения';
    return;
  }
  await beginJoin(parsed);
}

onMounted(async () => {
  if (auth.isAuthenticated.value) {
    await router.replace(
      typeof route.query.redirect === 'string' ? route.query.redirect : '/app',
    );
    return;
  }

  const codeParam =
    typeof route.query.code === 'string' ? normalizeInviteCode(route.query.code) : undefined;
  const tokenParam = typeof route.query.token === 'string' ? route.query.token : undefined;
  const emailParam = typeof route.query.email === 'string' ? route.query.email : undefined;

  if ((codeParam && isValidInviteCodeFormat(codeParam)) || tokenParam) {
    autoStarted.value = true;
    await beginJoin({ code: codeParam, token: tokenParam, email: emailParam });
  }
});
</script>

<template>
  <PlaceholderPage
    wireframe="W11"
    title="Приглашение в клуб"
    description="Код или ссылка открывают регистрацию в Logto. Уже есть аккаунт — войдите с главной."
  >
    <div v-if="autoStarted && loading" class="py-8 text-center text-text-muted">
      Открываем вход через Logto…
    </div>

    <form v-else class="space-y-4" @submit.prevent="submit">
      <label class="block text-sm text-text-muted" for="invite-input">
        Код или ссылка
      </label>
      <input
        id="invite-input"
        v-model="input"
        class="w-full rounded-md border border-border bg-bg px-3 py-2 font-mono text-sm text-text"
        placeholder="TAV-XXXX-XXXX или https://…/join?code=…"
        autocomplete="off"
      />
      <p v-if="error" class="text-sm text-error">{{ error }}</p>
      <UiButton type="submit" intent="primary" class="w-full" :disabled="loading">
        {{ loading ? 'Подождите…' : 'Принять приглашение' }}
      </UiButton>
    </form>

    <p class="mt-6 text-sm text-text-muted">
      Уже в клубе?
      <button
        type="button"
        class="text-primary underline"
        @click="auth.signIn(typeof route.query.redirect === 'string' ? route.query.redirect : '/app')"
      >
        Войти
      </button>
    </p>
  </PlaceholderPage>
</template>
