<script setup lang="ts">
import BrandLogo from '@/components/brand/BrandLogo.vue';
import { useAuth } from '@/composables/useAuth';
import { refreshPlatformRoles } from '@/services/roles';
import { useSessionStore } from '@/stores/session';
import { UiButton } from '@tavrida/ui';
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const auth = useAuth();
const session = useSessionStore();
const router = useRouter();
const checking = ref(false);

async function signOut() {
  await auth.signOut();
}

/** Admin may have lifted the lock — re-hit `/me/roles`. */
async function recheckAccess() {
  if (checking.value) return;
  checking.value = true;
  try {
    session.clearHardLockState();
    await refreshPlatformRoles();
    if (!session.isHardLocked) {
      await router.replace({ name: 'member-home' });
    }
  } finally {
    checking.value = false;
  }
}
</script>

<template>
  <div class="hard-lock-page flex min-h-dvh flex-col items-center justify-center px-6 py-12">
    <div class="mb-10">
      <BrandLogo class="h-10" />
    </div>

    <div class="hard-lock-card w-full max-w-md text-center">
      <div
        class="hard-lock-art mx-auto mb-8 flex h-44 w-44 items-center justify-center"
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 160 160"
          class="h-full w-full"
          role="img"
        >
          <title>Аккаунт заблокирован</title>
          <ellipse
            cx="80"
            cy="132"
            rx="48"
            ry="10"
            class="fill-border/60"
          />
          <path
            d="M80 28c18 10 36 12 48 14v42c0 28-20 48-48 56-28-8-48-28-48-56V42c12-2 30-4 48-14z"
            class="fill-surface stroke-border"
            stroke-width="2"
          />
          <rect
            x="58"
            y="78"
            width="44"
            height="36"
            rx="6"
            class="fill-error/15 stroke-error"
            stroke-width="2.5"
          />
          <path
            d="M68 78v-12a12 12 0 0 1 24 0v12"
            class="fill-none stroke-error"
            stroke-width="2.5"
            stroke-linecap="round"
          />
          <circle
            cx="80"
            cy="92"
            r="4"
            class="fill-error"
          />
          <rect
            x="78"
            y="92"
            width="4"
            height="10"
            rx="1"
            class="fill-error"
          />
          <line
            x1="44"
            y1="48"
            x2="116"
            y2="120"
            class="stroke-error"
            stroke-width="3.5"
            stroke-linecap="round"
            opacity="0.85"
          />
        </svg>
      </div>

      <h1 class="text-2xl font-semibold tracking-tight text-text">
        Аккаунт заблокирован
      </h1>
      <p class="mt-3 text-base leading-relaxed text-text-muted">
        Доступ к клубу закрыт администратором. Если это ошибка — напиши
        администратору и попроси снять блокировку.
      </p>

      <div class="mt-8 flex flex-wrap justify-center gap-3">
        <UiButton
          intent="secondary"
          :disabled="checking"
          @click="recheckAccess"
        >
          {{ checking ? 'Проверяем…' : 'Проверить снова' }}
        </UiButton>
        <UiButton
          intent="ghost"
          @click="signOut"
        >
          Выйти
        </UiButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hard-lock-page {
  background:
    radial-gradient(ellipse 80% 50% at 50% -10%, color-mix(in oklab, var(--color-error) 12%, transparent), transparent),
    var(--color-bg);
}

.hard-lock-art {
  animation: hard-lock-in 0.55s ease-out both;
}

.hard-lock-card > h1 {
  animation: hard-lock-in 0.55s ease-out 0.08s both;
}

.hard-lock-card > p {
  animation: hard-lock-in 0.55s ease-out 0.14s both;
}

.hard-lock-card > div:last-child {
  animation: hard-lock-in 0.55s ease-out 0.2s both;
}

@keyframes hard-lock-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
