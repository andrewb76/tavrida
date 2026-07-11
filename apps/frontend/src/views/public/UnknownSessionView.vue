<script setup lang="ts">
import PlaceholderPage from '@/components/PlaceholderPage.vue';
import { UiButton } from '@tavrida/ui';
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuth } from '@/composables/useAuth';

const auth = useAuth();
const route = useRoute();
const router = useRouter();

const reason = computed(() => {
  const q = route.query.reason;
  return typeof q === 'string' ? q : undefined;
});

const isLoggedIn = computed(() => auth.isAuthenticated.value);

async function signInAgain() {
  const redirect =
    typeof route.query.redirect === 'string' ? route.query.redirect : '/app';
  await auth.signIn(redirect);
}
</script>

<template>
  <PlaceholderPage
    wireframe="W01"
    title="Сессия входа не найдена"
    description="Сессия входа в Logto истекла или страница открыта не через приложение. Если у вас есть ссылка приглашения — откройте её снова. Уже есть аккаунт — войдите. Код без ссылки — введите на странице приглашения."
  >
    <p v-if="reason" class="mb-4 rounded-md bg-bg px-3 py-2 font-mono text-xs text-text-muted">
      {{ reason }}
    </p>

    <div class="flex flex-wrap gap-3">
      <UiButton
        v-if="isLoggedIn"
        intent="primary"
        @click="router.push({ name: 'member-home' })"
      >
        В приложение
      </UiButton>
      <UiButton v-else intent="primary" @click="signInAgain">
        Войти (уже есть аккаунт)
      </UiButton>
      <UiButton
        v-if="!isLoggedIn"
        intent="secondary"
        @click="router.push({ name: 'join' })"
      >
        Ввести код приглашения
      </UiButton>
      <UiButton intent="ghost" @click="router.push({ name: 'landing' })">
        На главную
      </UiButton>
    </div>
  </PlaceholderPage>
</template>
