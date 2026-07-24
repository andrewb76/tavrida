<script setup lang="ts">
import { UiButton, UiIcon } from '@tavrida/ui';
import { computed } from 'vue';
import { RouterLink, RouterView, useRoute } from 'vue-router';
import BrandLogo from '@/components/brand/BrandLogo.vue';
import CookieSettingsLink from '@/components/legal/CookieSettingsLink.vue';
import { useAuth } from '@/composables/useAuth';
import { useClubAccess } from '@/composables/useClubAccess';
import { useThemeStore } from '@/stores/theme';

const auth = useAuth();
const { inviteOnly } = useClubAccess();
const theme = useThemeStore();
const route = useRoute();

const isLanding = computed(() => route.name === 'landing');
const logoTheme = computed(() => {
  if (isLanding.value) return 'dark';
  return theme.mode === 'dark' ? 'dark' : 'light';
});
</script>

<template>
  <div class="min-h-dvh">
    <header
      class="z-20 border-b transition-colors"
      :class="
        isLanding
          ? 'absolute inset-x-0 top-0 border-white/10 bg-transparent'
          : 'border-border bg-surface/90 backdrop-blur-md'
      "
    >
      <div
        class="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6"
      >
        <RouterLink
          to="/"
          class="inline-flex shrink-0"
        >
          <BrandLogo
            variant="header"
            :theme="logoTheme"
          />
        </RouterLink>
        <nav class="flex items-center gap-1 sm:gap-2">
          <RouterLink
            to="/about"
            class="rounded-md px-3 py-2 text-sm transition-colors"
            :class="
              isLanding
                ? 'text-white/75 hover:bg-white/10 hover:text-white'
                : 'text-text-muted hover:bg-bg hover:text-text'
            "
          >
            О клубе
          </RouterLink>
          <RouterLink
            v-if="inviteOnly"
            to="/join"
            class="hidden rounded-md px-3 py-2 text-sm transition-colors sm:inline"
            :class="
              isLanding
                ? 'text-white/75 hover:bg-white/10 hover:text-white'
                : 'text-text-muted hover:bg-bg hover:text-text'
            "
          >
            Инвайт
          </RouterLink>
          <UiButton
            intent="ghost"
            size="sm"
            :class="isLanding ? 'text-white hover:bg-white/10' : ''"
            :title="theme.mode === 'light' ? 'Тёмная тема' : 'Светлая тема'"
            @click="theme.toggle()"
          >
            <UiIcon
              :name="theme.mode === 'light' ? 'moon' : 'sun'"
              :size="18"
              :label="theme.mode === 'light' ? 'Тёмная тема' : 'Светлая тема'"
            />
          </UiButton>
          <UiButton
            v-if="!auth.isAuthenticated.value && !inviteOnly"
            intent="secondary"
            size="sm"
            @click="auth.signUp()"
          >
            Регистрация
          </UiButton>
          <UiButton
            v-if="!auth.isAuthenticated.value"
            intent="primary"
            size="sm"
            @click="auth.signIn()"
          >
            Войти
          </UiButton>
          <RouterLink
            v-else-if="auth.isMember.value"
            to="/app"
          >
            <UiButton
              intent="primary"
              size="sm"
            >
              В клуб
            </UiButton>
          </RouterLink>
          <UiButton
            v-if="auth.isAuthenticated.value"
            intent="ghost"
            size="sm"
            :class="isLanding ? 'text-white hover:bg-white/10' : ''"
            @click="auth.signOut()"
          >
            Выйти
          </UiButton>
        </nav>
      </div>
    </header>

    <main
      :class="
        isLanding
          ? 'landing-main'
          : 'mx-auto max-w-5xl px-4 py-8 sm:px-6'
      "
    >
      <RouterView />
    </main>

    <footer
      v-if="!isLanding"
      class="border-t border-border bg-surface/80"
    >
      <div
        class="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4 text-sm text-text-muted sm:px-6"
      >
        <nav
          class="flex flex-wrap items-center gap-4"
          aria-label="Правовая информация"
        >
          <RouterLink
            to="/about"
            class="hover:text-text"
          >
            О клубе
          </RouterLink>
          <RouterLink
            to="/cookies"
            class="hover:text-text"
          >
            Политика cookie
          </RouterLink>
          <CookieSettingsLink class="hover:text-text" />
        </nav>
      </div>
    </footer>
  </div>
</template>
