<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useAuth } from '@/composables/useAuth';
import { consumePostAuthRedirect } from '@/services/authRedirect';

const auth = useAuth();
const error = ref<string | null>(null);

onMounted(async () => {
  const redirect = consumePostAuthRedirect() ?? '/app';
  try {
    await auth.signIn(redirect);
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Не удалось открыть вход';
  }
});
</script>

<template>
  <div class="mx-auto flex min-h-[40vh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
    <p class="text-sm text-text-muted">
      Сессия истекла. Открываем вход…
    </p>
    <p
      v-if="error"
      class="rounded-md bg-bg px-3 py-2 text-sm text-danger"
    >
      {{ error }}
    </p>
  </div>
</template>
