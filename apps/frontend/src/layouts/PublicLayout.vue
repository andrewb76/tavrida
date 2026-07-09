<script setup lang="ts">
import { UiButton } from '@tavrida/ui';
import { RouterLink, RouterView } from 'vue-router';
import { useAuth } from '@/composables/useAuth';
import { useThemeStore } from '@/stores/theme';

const auth = useAuth();
const theme = useThemeStore();
</script>

<template>
  <div class="min-h-dvh bg-bg">
    <header class="border-b border-border bg-surface">
      <div
        class="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3"
      >
        <RouterLink to="/" class="text-lg font-semibold text-primary">
          Tavrida Lot
        </RouterLink>
        <nav class="flex items-center gap-2">
          <RouterLink
            to="/about"
            class="rounded-md px-3 py-2 text-sm text-text-muted hover:bg-bg hover:text-text"
          >
            О клубе
          </RouterLink>
          <RouterLink
            to="/join"
            class="hidden rounded-md px-3 py-2 text-sm text-text-muted hover:bg-bg hover:text-text sm:inline"
          >
            Инвайт
          </RouterLink>
          <UiButton intent="ghost" size="sm" @click="theme.toggle()">
            {{ theme.mode === 'light' ? '🌙' : '☀️' }}
          </UiButton>
          <UiButton
            v-if="!auth.isAuthenticated.value"
            intent="primary"
            size="sm"
            @click="auth.signIn()"
          >
            Войти
          </UiButton>
          <RouterLink v-else-if="auth.isMember.value" to="/app">
            <UiButton intent="primary" size="sm">В клуб</UiButton>
          </RouterLink>
          <UiButton
            v-if="auth.isAuthenticated.value"
            intent="ghost"
            size="sm"
            @click="auth.signOut()"
          >
            Выйти
          </UiButton>
        </nav>
      </div>
    </header>

    <main class="mx-auto max-w-5xl px-4 py-8">
      <RouterView />
    </main>
  </div>
</template>
